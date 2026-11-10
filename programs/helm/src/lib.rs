use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

pub mod math;

use math::{
    check_oracle, equity, is_liquidatable, margin_required, unrealized_pnl, OracleCheck, Side,
};

solana_program::declare_id!("6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd");

#[cfg(not(feature = "no-entrypoint"))]
entrypoint!(process_instruction);

pub const STATUS_ACTIVE: u8 = 0;
pub const STATUS_REDUCE_ONLY: u8 = 1;
pub const STATUS_HALTED: u8 = 2;

// Anchor-compatible instruction discriminators (sha256("global:<name>")[..8])
const IX_INITIALIZE: [u8; 8] = [175, 175, 109, 31, 13, 152, 155, 237];
const IX_CREATE_MARKET: [u8; 8] = [103, 226, 97, 235, 200, 188, 251, 254];
const IX_POST_ORACLE: [u8; 8] = [165, 97, 14, 41, 6, 74, 148, 83];
const IX_SET_STATUS: [u8; 8] = [101, 175, 83, 107, 200, 141, 155, 182];
const IX_DEPOSIT: [u8; 8] = [242, 35, 198, 137, 82, 225, 242, 182];
const IX_WITHDRAW: [u8; 8] = [183, 18, 70, 156, 148, 109, 161, 34];
const IX_OPEN: [u8; 8] = [157, 151, 190, 107, 185, 208, 241, 21];
const IX_REDUCE: [u8; 8] = [14, 237, 91, 53, 69, 236, 67, 251];
const IX_LIQUIDATE: [u8; 8] = [223, 179, 226, 125, 48, 46, 39, 74];

const ACC_CONFIG: &[u8; 8] = b"HELMCFG1";
const ACC_VAULT: &[u8; 8] = b"HELMVLT1";
const ACC_MARKET: &[u8; 8] = b"HELMMKT1";
const ACC_POSITION: &[u8; 8] = b"HELMPOS1";

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Config {
    pub authority: Pubkey,
    pub oracle_authority: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Vault {
    pub bump: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Market {
    pub symbol: [u8; 8],
    pub status: u8,
    pub im_bps: u16,
    pub mm_bps: u16,
    pub max_leverage_x: u16,
    pub max_age_slots: u64,
    pub max_conf_bps: u16,
    pub max_jump_bps: u16,
    pub mark_price: u64,
    pub mark_conf: u64,
    pub mark_slot: u64,
    pub last_rejected_price: u64,
    pub open_interest_long: u64,
    pub open_interest_short: u64,
    pub insurance_lamports: u64,
    pub bump: u8,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Position {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub side: u8,
    pub size: u64,
    pub entry_price: u64,
    pub collateral: u64,
    pub bump: u8,
}

fn unpack<T: BorshDeserialize>(data: &[u8]) -> Result<T, ProgramError> {
    if data.len() < 8 {
        return Err(ProgramError::InvalidAccountData);
    }
    // Market accounts are allocated larger than the Borsh body (8 + 160).
    // deserialize (not try_from_slice) so leftover padding does not fail a stamp.
    let mut slice = &data[8..];
    T::deserialize(&mut slice).map_err(|_| ProgramError::InvalidAccountData)
}

fn pack<T: BorshSerialize>(disc: &[u8; 8], value: &T, dst: &mut [u8]) -> Result<(), ProgramError> {
    let body = value
        .try_to_vec()
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if dst.len() < 8 + body.len() {
        return Err(ProgramError::AccountDataTooSmall);
    }
    dst[..8].copy_from_slice(disc);
    dst[8..8 + body.len()].copy_from_slice(&body);
    Ok(())
}

fn create_pda<'a>(
    payer: &AccountInfo<'a>,
    target: &AccountInfo<'a>,
    system: &AccountInfo<'a>,
    program_id: &Pubkey,
    space: usize,
    seeds: &[&[u8]],
) -> ProgramResult {
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);
    invoke_signed(
        &system_instruction::create_account(payer.key, target.key, lamports, space as u64, program_id),
        &[payer.clone(), target.clone(), system.clone()],
        &[seeds],
    )
}

pub fn process_instruction<'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'a>],
    data: &[u8],
) -> ProgramResult {
    if data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let disc: [u8; 8] = data[..8].try_into().unwrap();
    let payload = &data[8..];
    match disc {
        IX_INITIALIZE => initialize(program_id, accounts, payload),
        IX_CREATE_MARKET => create_market(program_id, accounts, payload),
        IX_POST_ORACLE => post_oracle(program_id, accounts, payload),
        IX_SET_STATUS => set_market_status(program_id, accounts, payload),
        IX_DEPOSIT => deposit(program_id, accounts, payload),
        IX_WITHDRAW => withdraw(program_id, accounts, payload),
        IX_OPEN => open_or_increase(program_id, accounts, payload),
        IX_REDUCE => reduce(program_id, accounts, payload),
        IX_LIQUIDATE => liquidate(program_id, accounts, payload),
        _ => {
            msg!("unknown instruction");
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

fn initialize<'a>(program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let authority = next_account_info(iter)?;
    let config_ai = next_account_info(iter)?;
    let vault_ai = next_account_info(iter)?;
    let system = next_account_info(iter)?;
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if payload.len() < 32 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let oracle_authority = Pubkey::try_from(&payload[..32]).unwrap();
    let (cfg_pda, cfg_bump) = Pubkey::find_program_address(&[b"config"], program_id);
    let (vault_pda, vault_bump) = Pubkey::find_program_address(&[b"vault"], program_id);
    if cfg_pda != *config_ai.key || vault_pda != *vault_ai.key {
        return Err(ProgramError::InvalidSeeds);
    }
    create_pda(
        authority,
        config_ai,
        system,
        program_id,
        8 + 32 + 32 + 1 + 1,
        &[b"config", &[cfg_bump]],
    )?;
    create_pda(
        authority,
        vault_ai,
        system,
        program_id,
        8 + 1,
        &[b"vault", &[vault_bump]],
    )?;
    let config = Config {
        authority: *authority.key,
        oracle_authority,
        bump: cfg_bump,
        vault_bump,
    };
    pack(ACC_CONFIG, &config, &mut config_ai.data.borrow_mut())?;
    pack(ACC_VAULT, &Vault { bump: vault_bump }, &mut vault_ai.data.borrow_mut())?;
    Ok(())
}

fn create_market<'a>(program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let authority = next_account_info(iter)?;
    let config_ai = next_account_info(iter)?;
    let market_ai = next_account_info(iter)?;
    let system = next_account_info(iter)?;
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    // symbol 8 + im2 + mm2 + lev2 + age8 + conf2 + jump2 = 26
    if payload.len() < 26 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let symbol: [u8; 8] = payload[..8].try_into().unwrap();
    let im_bps = u16::from_le_bytes(payload[8..10].try_into().unwrap());
    let mm_bps = u16::from_le_bytes(payload[10..12].try_into().unwrap());
    let max_leverage_x = u16::from_le_bytes(payload[12..14].try_into().unwrap());
    let max_age_slots = u64::from_le_bytes(payload[14..22].try_into().unwrap());
    let max_conf_bps = u16::from_le_bytes(payload[22..24].try_into().unwrap());
    let max_jump_bps = u16::from_le_bytes(payload[24..26].try_into().unwrap());
    if !(im_bps > mm_bps && mm_bps > 0) {
        msg!("bad margin");
        return Err(ProgramError::InvalidArgument);
    }
    if !(1..=50).contains(&max_leverage_x) || max_age_slots == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    let config: Config = unpack(&config_ai.data.borrow())?;
    if config.authority != *authority.key {
        return Err(ProgramError::IllegalOwner);
    }
    let (m_pda, m_bump) = Pubkey::find_program_address(&[b"market", &symbol], program_id);
    if m_pda != *market_ai.key {
        return Err(ProgramError::InvalidSeeds);
    }
    create_pda(
        authority,
        market_ai,
        system,
        program_id,
        8 + 160,
        &[b"market", &symbol, &[m_bump]],
    )?;
    let market = Market {
        symbol,
        status: STATUS_ACTIVE,
        im_bps,
        mm_bps,
        max_leverage_x,
        max_age_slots,
        max_conf_bps,
        max_jump_bps,
        mark_price: 0,
        mark_conf: 0,
        mark_slot: 0,
        last_rejected_price: 0,
        open_interest_long: 0,
        open_interest_short: 0,
        insurance_lamports: 0,
        bump: m_bump,
    };
    pack(ACC_MARKET, &market, &mut market_ai.data.borrow_mut())?;
    Ok(())
}

fn post_oracle<'a>(_program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let oracle = next_account_info(iter)?;
    let config_ai = next_account_info(iter)?;
    let market_ai = next_account_info(iter)?;
    if !oracle.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if payload.len() < 32 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let _symbol = &payload[..8];
    let price = u64::from_le_bytes(payload[8..16].try_into().unwrap());
    let confidence = u64::from_le_bytes(payload[16..24].try_into().unwrap());
    let publish_slot = u64::from_le_bytes(payload[24..32].try_into().unwrap());
    if price == 0 {
        msg!("missing oracle");
        return Err(ProgramError::InvalidArgument);
    }
    let config: Config = unpack(&config_ai.data.borrow())?;
    if config.oracle_authority != *oracle.key {
        return Err(ProgramError::IllegalOwner);
    }
    let clock = Clock::get()?;
    if publish_slot > clock.slot {
        msg!("oracle from the future");
        return Err(ProgramError::InvalidArgument);
    }
    let mut market: Market = unpack(&market_ai.data.borrow())?;
    let check = check_oracle(
        clock.slot,
        publish_slot,
        price,
        confidence,
        market.mark_price,
        market.max_age_slots,
        market.max_conf_bps,
        market.max_jump_bps,
    );
    match check {
        OracleCheck::Jump => {
            market.last_rejected_price = price;
            market.status = STATUS_REDUCE_ONLY;
            msg!("circuit tripped: jump");
        }
        OracleCheck::WideConfidence => {
            if market.mark_price == 0 {
                market.mark_price = price;
                market.mark_conf = confidence;
                market.mark_slot = publish_slot;
            }
            market.last_rejected_price = price;
            market.status = STATUS_REDUCE_ONLY;
            msg!("circuit tripped: wide confidence");
        }
        OracleCheck::Ok | OracleCheck::Stale => {
            if check == OracleCheck::Ok || market.mark_price == 0 {
                market.mark_price = price;
                market.mark_conf = confidence;
                market.mark_slot = publish_slot;
            }
        }
        OracleCheck::Missing => return Err(ProgramError::InvalidArgument),
    }
    pack(ACC_MARKET, &market, &mut market_ai.data.borrow_mut())?;
    Ok(())
}

fn set_market_status<'a>(_program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let authority = next_account_info(iter)?;
    let config_ai = next_account_info(iter)?;
    let market_ai = next_account_info(iter)?;
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if payload.len() < 9 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let status = payload[8];
    if status > STATUS_HALTED {
        return Err(ProgramError::InvalidArgument);
    }
    let config: Config = unpack(&config_ai.data.borrow())?;
    if config.authority != *authority.key {
        return Err(ProgramError::IllegalOwner);
    }
    let mut market: Market = unpack(&market_ai.data.borrow())?;
    market.status = status;
    pack(ACC_MARKET, &market, &mut market_ai.data.borrow_mut())?;
    Ok(())
}

fn load_modify<'a>(
    program_id: &Pubkey,
    accounts: &'a [AccountInfo<'a>],
) -> Result<
    (
        AccountInfo<'a>,
        Config,
        AccountInfo<'a>,
        Market,
        AccountInfo<'a>,
        AccountInfo<'a>,
        AccountInfo<'a>,
    ),
    ProgramError,
> {
    if accounts.len() < 6 {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    let owner = accounts[0].clone();
    let config_ai = accounts[1].clone();
    let market_ai = accounts[2].clone();
    let position_ai = accounts[3].clone();
    let vault_ai = accounts[4].clone();
    let system = accounts[5].clone();
    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let config: Config = unpack(&config_ai.data.borrow())?;
    let market: Market = unpack(&market_ai.data.borrow())?;
    let (expected, _) = Pubkey::find_program_address(&[b"vault"], program_id);
    if expected != *vault_ai.key {
        return Err(ProgramError::InvalidSeeds);
    }
    Ok((owner, config, market_ai, market, position_ai, vault_ai, system))
}

fn ensure_position<'a>(
    program_id: &Pubkey,
    owner: &AccountInfo<'a>,
    market_ai: &AccountInfo<'a>,
    position_ai: &AccountInfo<'a>,
    system: &AccountInfo<'a>,
) -> Result<(Position, u8), ProgramError> {
    let (pda, bump) =
        Pubkey::find_program_address(&[b"position", market_ai.key.as_ref(), owner.key.as_ref()], program_id);
    if pda != *position_ai.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if position_ai.data_len() == 0 || position_ai.lamports() == 0 {
        create_pda(
            owner,
            position_ai,
            system,
            program_id,
            8 + 32 + 32 + 1 + 8 + 8 + 8 + 1,
            &[b"position", market_ai.key.as_ref(), owner.key.as_ref(), &[bump]],
        )?;
        let pos = Position {
            owner: *owner.key,
            market: *market_ai.key,
            side: 0,
            size: 0,
            entry_price: 0,
            collateral: 0,
            bump,
        };
        pack(ACC_POSITION, &pos, &mut position_ai.data.borrow_mut())?;
        return Ok((pos, bump));
    }
    let pos: Position = unpack(&position_ai.data.borrow())?;
    Ok((pos, bump))
}

fn require_live_oracle(market: &Market) -> ProgramResult {
    let clock = Clock::get()?;
    match check_oracle(
        clock.slot,
        market.mark_slot,
        market.mark_price,
        market.mark_conf,
        market.mark_price,
        market.max_age_slots,
        market.max_conf_bps,
        u16::MAX,
    ) {
        OracleCheck::Ok => Ok(()),
        other => {
            msg!("oracle not live: {:?}", other);
            Err(ProgramError::InvalidAccountData)
        }
    }
}

fn side_of(flag: u8) -> Result<Side, ProgramError> {
    match flag {
        0 => Ok(Side::Long),
        1 => Ok(Side::Short),
        _ => Err(ProgramError::InvalidAccountData),
    }
}

fn deposit<'a>(program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    if payload.len() < 16 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let amount = u64::from_le_bytes(payload[8..16].try_into().unwrap());
    if amount == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    let (owner, _config, market_ai, _market, position_ai, vault_ai, system) =
        load_modify(program_id, accounts)?;
    let (mut pos, _) = ensure_position(program_id, &owner, &market_ai, &position_ai, &system)?;
    invoke(
        &system_instruction::transfer(owner.key, vault_ai.key, amount),
        &[owner.clone(), vault_ai.clone(), system.clone()],
    )?;
    pos.owner = *owner.key;
    pos.market = *market_ai.key;
    pos.collateral = pos
        .collateral
        .checked_add(amount)
        .ok_or(ProgramError::InvalidArgument)?;
    pack(ACC_POSITION, &pos, &mut position_ai.data.borrow_mut())?;
    Ok(())
}

fn withdraw<'a>(program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    if payload.len() < 16 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let amount = u64::from_le_bytes(payload[8..16].try_into().unwrap());
    if amount == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    let (owner, _config, market_ai, market, position_ai, vault_ai, system) =
        load_modify(program_id, accounts)?;
    let (mut pos, _) = ensure_position(program_id, &owner, &market_ai, &position_ai, &system)?;
    if pos.collateral < amount {
        return Err(ProgramError::InsufficientFunds);
    }
    if pos.size > 0 {
        require_live_oracle(&market)?;
        let side = side_of(pos.side)?;
        let upnl = unrealized_pnl(side, pos.size, pos.entry_price, market.mark_price);
        let new_collat = pos.collateral - amount;
        let eq = equity(new_collat, upnl);
        let im = margin_required(pos.size, market.mark_price, market.im_bps) as i128;
        if eq < im {
            msg!("withdraw would breach IM");
            return Err(ProgramError::InsufficientFunds);
        }
    }
    let rent_min = Rent::get()?.minimum_balance(vault_ai.data_len());
    if vault_ai.lamports() < amount.saturating_add(rent_min) {
        return Err(ProgramError::InsufficientFunds);
    }
    **vault_ai.try_borrow_mut_lamports()? -= amount;
    **owner.try_borrow_mut_lamports()? += amount;
    pos.collateral -= amount;
    pack(ACC_POSITION, &pos, &mut position_ai.data.borrow_mut())?;
    let _ = system;
    Ok(())
}

fn open_or_increase<'a>(program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    if payload.len() < 17 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let is_long = payload[8] != 0;
    let size = u64::from_le_bytes(payload[9..17].try_into().unwrap());
    if size == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    let (owner, _config, market_ai, mut market, position_ai, _vault, system) =
        load_modify(program_id, accounts)?;
    if market.status != STATUS_ACTIVE {
        msg!("market not active");
        return Err(ProgramError::InvalidAccountData);
    }
    require_live_oracle(&market)?;
    let mark = market.mark_price;
    let side = if is_long { Side::Long } else { Side::Short };
    let (mut pos, _) = ensure_position(program_id, &owner, &market_ai, &position_ai, &system)?;
    if pos.size == 0 {
        pos.side = if is_long { 0 } else { 1 };
        pos.entry_price = mark;
        pos.size = size;
    } else {
        let existing = side_of(pos.side)?;
        if existing != side {
            msg!("must reduce first");
            return Err(ProgramError::InvalidArgument);
        }
        let new_size = pos.size.checked_add(size).ok_or(ProgramError::InvalidArgument)?;
        let weighted =
            (pos.size as u128) * (pos.entry_price as u128) + (size as u128) * (mark as u128);
        pos.entry_price = (weighted / new_size as u128) as u64;
        pos.size = new_size;
    }
    let upnl = unrealized_pnl(side, pos.size, pos.entry_price, mark);
    let eq = equity(pos.collateral, upnl);
    let im = margin_required(pos.size, mark, market.im_bps) as i128;
    if eq < im {
        msg!("insufficient margin");
        return Err(ProgramError::InsufficientFunds);
    }
    let notional = math::notional(pos.size, mark);
    let max_notional = (pos.collateral as u128) * (market.max_leverage_x as u128);
    if notional > max_notional {
        msg!("leverage cap");
        return Err(ProgramError::InvalidArgument);
    }
    if is_long {
        market.open_interest_long = market
            .open_interest_long
            .checked_add(size)
            .ok_or(ProgramError::InvalidArgument)?;
    } else {
        market.open_interest_short = market
            .open_interest_short
            .checked_add(size)
            .ok_or(ProgramError::InvalidArgument)?;
    }
    pack(ACC_POSITION, &pos, &mut position_ai.data.borrow_mut())?;
    pack(ACC_MARKET, &market, &mut market_ai.data.borrow_mut())?;
    Ok(())
}

fn reduce<'a>(program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], payload: &[u8]) -> ProgramResult {
    if payload.len() < 16 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let size = u64::from_le_bytes(payload[8..16].try_into().unwrap());
    if size == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    let (owner, _config, market_ai, mut market, position_ai, _vault, system) =
        load_modify(program_id, accounts)?;
    if market.status == STATUS_HALTED {
        return Err(ProgramError::InvalidAccountData);
    }
    require_live_oracle(&market)?;
    let (mut pos, _) = ensure_position(program_id, &owner, &market_ai, &position_ai, &system)?;
    if pos.size < size {
        return Err(ProgramError::InvalidArgument);
    }
    let side = side_of(pos.side)?;
    let realized = unrealized_pnl(side, size, pos.entry_price, market.mark_price);
    let new_collat = (pos.collateral as i128) + realized;
    if new_collat < 0 {
        msg!("insolvent reduce — liquidate instead");
        return Err(ProgramError::InsufficientFunds);
    }
    pos.collateral = new_collat as u64;
    pos.size -= size;
    if pos.size == 0 {
        pos.entry_price = 0;
    }
    if side == Side::Long {
        market.open_interest_long = market.open_interest_long.saturating_sub(size);
    } else {
        market.open_interest_short = market.open_interest_short.saturating_sub(size);
    }
    pack(ACC_POSITION, &pos, &mut position_ai.data.borrow_mut())?;
    pack(ACC_MARKET, &market, &mut market_ai.data.borrow_mut())?;
    Ok(())
}

fn liquidate<'a>(program_id: &Pubkey, accounts: &'a [AccountInfo<'a>], _payload: &[u8]) -> ProgramResult {
    let iter = &mut accounts.iter();
    let _liquidator = next_account_info(iter)?;
    let owner = next_account_info(iter)?;
    let _config_ai = next_account_info(iter)?;
    let market_ai = next_account_info(iter)?;
    let position_ai = next_account_info(iter)?;
    let mut market: Market = unpack(&market_ai.data.borrow())?;
    if market.status == STATUS_HALTED {
        return Err(ProgramError::InvalidAccountData);
    }
    require_live_oracle(&market)?;
    let (pda, _) =
        Pubkey::find_program_address(&[b"position", market_ai.key.as_ref(), owner.key.as_ref()], program_id);
    if pda != *position_ai.key {
        return Err(ProgramError::InvalidSeeds);
    }
    let mut pos: Position = unpack(&position_ai.data.borrow())?;
    if pos.size == 0 {
        return Err(ProgramError::InvalidAccountData);
    }
    let side = side_of(pos.side)?;
    let upnl = unrealized_pnl(side, pos.size, pos.entry_price, market.mark_price);
    if !is_liquidatable(pos.collateral, upnl, pos.size, market.mark_price, market.mm_bps) {
        msg!("not liquidatable");
        return Err(ProgramError::InvalidArgument);
    }
    let leftover = equity(pos.collateral, upnl);
    let size = pos.size;
    pos.size = 0;
    pos.entry_price = 0;
    pos.collateral = 0;
    if leftover > 0 {
        market.insurance_lamports = market.insurance_lamports.saturating_add(leftover as u64);
    }
    if side == Side::Long {
        market.open_interest_long = market.open_interest_long.saturating_sub(size);
    } else {
        market.open_interest_short = market.open_interest_short.saturating_sub(size);
    }
    pack(ACC_POSITION, &pos, &mut position_ai.data.borrow_mut())?;
    pack(ACC_MARKET, &market, &mut market_ai.data.borrow_mut())?;
    Ok(())
}
