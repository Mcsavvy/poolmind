import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const deployer = accounts.get("deployer")!;

// Error constants matching the contract
const ERR_NOT_AUTHORIZED = 101;
const ERR_PAUSED = 102;
const ERR_TRANSFERS_DISABLED = 103;
const ERR_INSUFFICIENT_BALANCE = 104;
const ERR_ZERO_DEPOSIT = 105;
const ERR_ZERO_WITHDRAWAL = 106;
const ERR_NAV_NOT_POSITIVE = 107;
const ERR_SELF_TRANSFER = 108;
const ERR_INSUFFICIENT_STX_BALANCE = 109;

// Helper function to setup admin authorization
function setupAdmin() {
  const setAdminResult = simnet.callPublicFn(
    "poolmind",
    "set-admin",
    [Cl.principal(deployer)],
    deployer
  );
  expect(setAdminResult.result).toBeOk(Cl.bool(true));
}

// Helper function to fund the contract with initial STX
function fundContract(amount: number = 100000000000000) {
  // Transfer STX from deployer to the contract
  const transferResult = simnet.transferSTX(
    amount,
    `${deployer}.poolmind`,
    deployer
  );
  expect(transferResult.result).toBeOk(Cl.bool(true));
}

// Helper function to setup NAV
function setupNAV(nav: number = 1000000) {
  setupAdmin();
  const updateNavResult = simnet.callPublicFn(
    "poolmind",
    "update-nav",
    [Cl.uint(nav)],
    deployer
  );
  expect(updateNavResult.result).toBeOk(Cl.bool(true));
}

describe("PoolMind Contract Tests", () => {
  beforeEach(() => {
    simnet.setEpoch("3.0");
    // Fund the contract with initial STX for testing
    fundContract();
  });

  // 1. Initialization Tests
  describe("Contract Initialization", () => {
    it("should initialize with correct default values", () => {
      const contractState = simnet.callReadOnlyFn(
        "poolmind",
        "get-contract-state",
        [],
        deployer
      );

      expect(contractState.result).toBeOk(
        Cl.tuple({
          admin: Cl.principal(deployer),
          paused: Cl.bool(false),
          transferable: Cl.bool(false),
          nav: Cl.uint(1000000),
          "entry-fee": Cl.uint(5),
          "exit-fee": Cl.uint(5),
          "stx-balance": Cl.uint(100000000000000),
        })
      );
    });
  });

  // 2. SIP-010 Token Standard Tests
  describe("SIP-010 Token Standard", () => {
    it("should return correct token metadata", () => {
      const name = simnet.callReadOnlyFn("poolmind", "get-name", [], deployer);
      const symbol = simnet.callReadOnlyFn(
        "poolmind",
        "get-symbol",
        [],
        deployer
      );
      const decimals = simnet.callReadOnlyFn(
        "poolmind",
        "get-decimals",
        [],
        deployer
      );
      const tokenUri = simnet.callReadOnlyFn(
        "poolmind",
        "get-token-uri",
        [],
        deployer
      );

      expect(name.result).toBeOk(Cl.stringAscii("PoolMind"));
      expect(symbol.result).toBeOk(Cl.stringAscii("PLMD"));
      expect(decimals.result).toBeOk(Cl.uint(6));
      expect(tokenUri.result).toBeOk(
        Cl.some(Cl.stringUtf8("https://poolmind.futurdevs.com/plmd.metadata.json"))
      );
    });
  });

  // 3. Admin Control Tests
  describe("Admin Controls", () => {
    it("should allow contract owner to set admin", () => {
      const result = simnet.callPublicFn(
        "poolmind",
        "set-admin",
        [Cl.principal(address1)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should reject non-owner attempts to set admin", () => {
      const result = simnet.callPublicFn(
        "poolmind",
        "set-admin",
        [Cl.principal(address2)],
        address1
      );
      expect(result.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should allow admin to pause/unpause contract", () => {
      setupAdmin();

      const pauseResult = simnet.callPublicFn(
        "poolmind",
        "set-paused",
        [Cl.bool(true)],
        deployer
      );
      expect(pauseResult.result).toBeOk(Cl.bool(true));

      const unpauseResult = simnet.callPublicFn(
        "poolmind",
        "set-paused",
        [Cl.bool(false)],
        deployer
      );
      expect(unpauseResult.result).toBeOk(Cl.bool(true));
    });

    it("should reject non-admin attempts to pause contract", () => {
      const result = simnet.callPublicFn(
        "poolmind",
        "set-paused",
        [Cl.bool(true)],
        address1
      );
      expect(result.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should allow admin to set token transferability", () => {
      setupAdmin();

      const result = simnet.callPublicFn(
        "poolmind",
        "set-token-transferable",
        [Cl.bool(true)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to set entry fee rate", () => {
      setupAdmin();

      const result = simnet.callPublicFn(
        "poolmind",
        "set-entry-fee-rate",
        [Cl.uint(10)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to set exit fee rate", () => {
      setupAdmin();

      const result = simnet.callPublicFn(
        "poolmind",
        "set-exit-fee-rate",
        [Cl.uint(15)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to update NAV", () => {
      setupAdmin();

      const result = simnet.callPublicFn(
        "poolmind",
        "update-nav",
        [Cl.uint(1200000)],
        deployer
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow admin to withdraw STX and deposit back", () => {
      setupAdmin();

      // Admin withdraw
      const withdrawResult = simnet.callPublicFn(
        "poolmind",
        "withdraw-to-admin",
        [Cl.uint(100000)],
        deployer
      );
      expect(withdrawResult.result).toBeOk(Cl.bool(true));

      // Admin deposit
      const depositResult = simnet.callPublicFn(
        "poolmind",
        "admin-deposit",
        [Cl.uint(50000)],
        deployer
      );
      expect(depositResult.result).toBeOk(Cl.bool(true));
    });
  });

  // 4. User Deposit and Withdrawal Tests
  describe("User Deposits and Withdrawals", () => {
    it("should allow user to deposit STX and receive PLMD tokens", () => {
      setupNAV();

      const depositAmount = 10000000; // 10 STX
      const result = simnet.callPublicFn(
        "poolmind",
        "deposit",
        [Cl.uint(depositAmount)],
        address1
      );

      expect(result.result).toBeOk(Cl.uint(9950000)); // After 0.5% fee

      // Check balance
      const balance = simnet.callReadOnlyFn(
        "poolmind",
        "get-balance",
        [Cl.principal(address1)],
        deployer
      );

      expect(balance.result).toBeOk(Cl.uint(9950000));
    });

    it("should reject deposits when contract is paused", () => {
      setupNAV();

      // Pause the contract
      simnet.callPublicFn("poolmind", "set-paused", [Cl.bool(true)], deployer);

      const result = simnet.callPublicFn(
        "poolmind",
        "deposit",
        [Cl.uint(1000000)],
        address1
      );
      expect(result.result).toBeErr(Cl.uint(ERR_PAUSED));
    });

    it("should reject zero deposits", () => {
      setupNAV();

      const result = simnet.callPublicFn(
        "poolmind",
        "deposit",
        [Cl.uint(0)],
        address1
      );
      expect(result.result).toBeErr(Cl.uint(ERR_ZERO_DEPOSIT));
    });

    it("should reject deposits when NAV is not positive", () => {
      setupAdmin();
      setupNAV(0);

      const result = simnet.callPublicFn(
        "poolmind",
        "deposit",
        [Cl.uint(1000000)],
        address1
      );
      expect(result.result).toBeErr(Cl.uint(ERR_NAV_NOT_POSITIVE));
    });

    it("should allow user to withdraw STX by burning PLMD tokens", () => {
      setupNAV();

      // First deposit to get tokens
      simnet.callPublicFn("poolmind", "deposit", [Cl.uint(10000000)], address1);

      const plmdBalance = simnet.callReadOnlyFn(
        "poolmind",
        "get-balance",
        [Cl.principal(address1)],
        deployer
      );
      expect(plmdBalance.result).toBeOk(Cl.uint(9950000));

      // Then withdraw some tokens
      const withdrawResult = simnet.callPublicFn(
        "poolmind",
        "withdraw",
        [Cl.uint(9950000)],
        address1
      );

      // original balance minus 0.5% exit fee
      expect(withdrawResult.result).toBeOk(Cl.uint(9950000 - 9950000 * 0.005));

      const plmdBalanceAfterWithdraw = simnet.callReadOnlyFn(
        "poolmind",
        "get-balance",
        [Cl.principal(address1)],
        deployer
      );
      expect(plmdBalanceAfterWithdraw.result).toBeOk(Cl.uint(0));
    });

    it("should reject zero withdrawals", () => {
      setupNAV();

      const result = simnet.callPublicFn(
        "poolmind",
        "withdraw",
        [Cl.uint(0)],
        address1
      );
      expect(result.result).toBeErr(Cl.uint(ERR_ZERO_WITHDRAWAL));
    });

    it("should reject withdrawals when user has insufficient PLMD token balance", () => {
      setupNAV();

      // Try to withdraw tokens without having any
      const result = simnet.callPublicFn(
        "poolmind",
        "withdraw",
        [Cl.uint(1000000)],
        address1
      );
      expect(result.result).toBeErr(Cl.uint(ERR_INSUFFICIENT_BALANCE));
    });

    it("should reject admin withdrawal when contract has insufficient STX balance", () => {
      setupAdmin();

      // Try to withdraw more STX than the contract has
      const contractBalance = 100000000000000; // Default contract balance
      const excessiveAmount = contractBalance + 1000000; // More than available

      const result = simnet.callPublicFn(
        "poolmind",
        "withdraw-to-admin",
        [Cl.uint(excessiveAmount)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(ERR_INSUFFICIENT_STX_BALANCE));
    });
  });

  // 5. Token Transfer Tests
  describe("Token Transfers", () => {
    it("should reject transfers when transferability is disabled", () => {
      setupNAV();

      // First get some tokens
      simnet.callPublicFn("poolmind", "deposit", [Cl.uint(10000000)], address1);

      // Try to transfer (should fail as transfers are disabled by default)
      const transferResult = simnet.callPublicFn(
        "poolmind",
        "transfer",
        [
          Cl.uint(1000000),
          Cl.principal(address1),
          Cl.principal(address2),
          Cl.none(),
        ],
        address1
      );
      expect(transferResult.result).toBeErr(Cl.uint(ERR_TRANSFERS_DISABLED));
    });

    it("should allow transfers when transferability is enabled", () => {
      setupNAV();

      // Enable transfers
      simnet.callPublicFn(
        "poolmind",
        "set-token-transferable",
        [Cl.bool(true)],
        deployer
      );

      // Get some tokens
      simnet.callPublicFn("poolmind", "deposit", [Cl.uint(10000000)], address1);

      // Transfer tokens
      const transferResult = simnet.callPublicFn(
        "poolmind",
        "transfer",
        [
          Cl.uint(1000000),
          Cl.principal(address1),
          Cl.principal(address2),
          Cl.none(),
        ],
        address1
      );
      expect(transferResult.result).toBeOk(Cl.bool(true));
    });

    it("should reject unauthorized transfers", () => {
      setupNAV();

      // Enable transfers
      simnet.callPublicFn(
        "poolmind",
        "set-token-transferable",
        [Cl.bool(true)],
        deployer
      );

      // Get some tokens for address1
      simnet.callPublicFn("poolmind", "deposit", [Cl.uint(10000000)], address1);

      // Try to transfer from address1 but call from address2 (should fail)
      const transferResult = simnet.callPublicFn(
        "poolmind",
        "transfer",
        [
          Cl.uint(1000000),
          Cl.principal(address1),
          Cl.principal(address2),
          Cl.none(),
        ],
        address2
      );
      expect(transferResult.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
    });

    it("should reject self-transfers", () => {
      setupNAV();

      // Enable transfers
      simnet.callPublicFn(
        "poolmind",
        "set-token-transferable",
        [Cl.bool(true)],
        deployer
      );

      // Get some tokens
      simnet.callPublicFn("poolmind", "deposit", [Cl.uint(10000000)], address1);

      // Try to transfer to self
      const transferResult = simnet.callPublicFn(
        "poolmind",
        "transfer",
        [
          Cl.uint(1000000),
          Cl.principal(address1),
          Cl.principal(address1),
          Cl.none(),
        ],
        address1
      );
      expect(transferResult.result).toBeErr(Cl.uint(ERR_SELF_TRANSFER));
    });

    it("should correctly track token balances", () => {
      setupNAV();

      // Deposit tokens
      simnet.callPublicFn("poolmind", "deposit", [Cl.uint(10000000)], address1);

      // Check balance
      const balance = simnet.callReadOnlyFn(
        "poolmind",
        "get-balance",
        [Cl.principal(address1)],
        deployer
      );

      expect(balance.result).toBeOk(Cl.uint(9950000)); // 10 STX minus 0.5% fee
    });
  });
});
