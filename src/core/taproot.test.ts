import { address as btcAddress, crypto as bcrypto, opcodes, payments, script as bscript } from 'bitcoinjs-lib';
import { describe, expect, it } from 'vitest';
import { concatBytes, equalBytes, fromHex, toHex } from './bytes';
import { ecc } from './ecc';
import { publicKeyFromMnemonic } from './keys';
import { getNetwork } from './networks';
import {
  buildChildLeaf,
  buildGuardianRecoveryLeaf,
  createTaprootVault,
  decodeGuardianRecoveryLeaf,
  describeTaprootVault,
  GUARDIAN_RECOVERY_DELAY_BLOCKS,
  NUMS_INTERNAL_KEY_HEX,
  tapleafHash,
  taprootDerivationPath,
  toXOnly,
} from './taproot';
import {
  TEST_CHILD_MNEMONIC,
  TEST_GUARDIAN_MNEMONIC,
  TEST_OTHER_MNEMONIC,
  TEST_PARENT_MNEMONIC,
  TEST_UNLOCK_TIME,
} from './test-fixtures';

/**
 * v1 PREVIEW test vector (RFC 0002). Keys at m/86'/1'/0'/0/0 of the public
 * BIP39 test mnemonics. The guardians stand for the foundation key, the
 * family guardian and the notary; the leaf sorts them by x-only key. The
 * values were produced by this module and are checked below against an
 * independent BIP341 computation (tagged hashes and x-only tweak).
 */
const VECTOR = {
  child: '03c9b6a3c4210cd78bf0734755c44c0fa9d51277a45c1e4929face4694387c1589',
  foundation: '0255355ca83c973f1d97ce0e3843c85d78905af16b4dc531bc488e57212d230116',
  familyGuardian: '029ff08732287dca062343cf43f763ea84dcd40348a1dd6f90956beb0c59c33b94',
  notary: '02ed448f7bf9160cd2f3b0b88e29486df8d09c2cc4705ebf0655d33f3373e4f322',
  childLeaf: '05009fc18000b17520c9b6a3c4210cd78bf0734755c44c0fa9d51277a45c1e4929face4694387c1589ac',
  guardianLeaf:
    '02a866b2752055355ca83c973f1d97ce0e3843c85d78905af16b4dc531bc488e57212d230116ac209ff08732287dca062343cf43f763ea84dcd40348a1dd6f90956beb0c59c33b94ba20ed448f7bf9160cd2f3b0b88e29486df8d09c2cc4705ebf0655d33f3373e4f322ba529c',
  childLeafHash: '71be3cd980b7942bec9323d045fe492fc538b7b466aabfb5962b5fec62656ce2',
  guardianLeafHash: '79bc4de6b6aa79f224ae31a512802c01c06b35047201272544320b04e88f2a14',
  outputKey: '906cb618acdcec0045202cd29e621c9ba0ada35c7a8a4683deb6c4807d49bab4', // gitleaks:allow (public test vector)
  address: 'tb1pjpktvx9vmnkqq3fq9nffucsunws2mg6u029ydq77kmzgql2fh26q3sp3jz',
  guardianControlBlock:
    'c150929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac071be3cd980b7942bec9323d045fe492fc538b7b466aabfb5962b5fec62656ce2',
};

const PATH = taprootDerivationPath('signet');

function keys() {
  return {
    child: publicKeyFromMnemonic(TEST_CHILD_MNEMONIC, 'signet', PATH),
    foundation: publicKeyFromMnemonic(TEST_PARENT_MNEMONIC, 'signet', PATH),
    familyGuardian: publicKeyFromMnemonic(TEST_OTHER_MNEMONIC, 'signet', PATH),
    notary: publicKeyFromMnemonic(TEST_GUARDIAN_MNEMONIC, 'signet', PATH),
  };
}

function vector() {
  const k = keys();
  return createTaprootVault(
    { childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: [k.foundation, k.familyGuardian, k.notary] },
    'signet',
  );
}

describe('taproot vault v1 preview', () => {
  it('uses the BIP86 path and matches the published BIP86 test vector', () => {
    expect(PATH).toBe("m/86'/1'/0'/0/0");
    expect(taprootDerivationPath('mainnet', 3)).toBe("m/86'/0'/0'/0/3");
    // BIP86: m/86'/0'/0'/0/0 of the "abandon ... about" mnemonic.
    const internal = toXOnly(publicKeyFromMnemonic(TEST_PARENT_MNEMONIC, 'mainnet', taprootDerivationPath('mainnet')));
    expect(toHex(internal)).toBe('cc8a4bc64d897bddc5fbc2f670f7a8ba0b386779106cf1223c6fc5d7cd6fc115');
    expect(payments.p2tr({ internalPubkey: internal }).address).toBe(
      'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
    );
  });

  it('uses the BIP341 unspendable internal key', () => {
    expect(ecc.isXOnlyPoint(fromHex(NUMS_INTERNAL_KEY_HEX))).toBe(true);
    // lift_x(sha256(G uncompressed)) per BIP341.
    const g = fromHex(
      '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
    );
    expect(toHex(bcrypto.sha256(g))).toBe(NUMS_INTERNAL_KEY_HEX);
  });

  it('derives the documented test vector', () => {
    const k = keys();
    expect(toHex(k.child)).toBe(VECTOR.child);
    expect(toHex(k.foundation)).toBe(VECTOR.foundation);
    expect(toHex(k.familyGuardian)).toBe(VECTOR.familyGuardian);
    expect(toHex(k.notary)).toBe(VECTOR.notary);
    const v = vector();
    expect(toHex(v.childLeaf)).toBe(VECTOR.childLeaf);
    expect(toHex(v.guardianLeaf)).toBe(VECTOR.guardianLeaf);
    expect(toHex(v.childLeafHash)).toBe(VECTOR.childLeafHash);
    expect(toHex(v.guardianLeafHash)).toBe(VECTOR.guardianLeafHash);
    expect(toHex(v.outputKey)).toBe(VECTOR.outputKey);
    expect(v.address).toBe(VECTOR.address);
    expect(toHex(v.guardianControlBlock)).toBe(VECTOR.guardianControlBlock);
    expect(v.recoveryDelayBlocks).toBe(GUARDIAN_RECOVERY_DELAY_BLOCKS);
    expect(describeTaprootVault(v).address).toBe(VECTOR.address);
  });

  it('matches an independent BIP341 computation of the output key', () => {
    const v = vector();
    // Tapleaf hashes.
    const leafHash = (leaf: Uint8Array) =>
      bcrypto.taggedHash('TapLeaf', concatBytes(Uint8Array.of(0xc0), Uint8Array.of(leaf.length), leaf));
    expect(toHex(leafHash(v.childLeaf))).toBe(VECTOR.childLeafHash);
    expect(toHex(leafHash(v.guardianLeaf))).toBe(VECTOR.guardianLeafHash);
    expect(equalBytes(tapleafHash(v.guardianLeaf), v.guardianLeafHash)).toBe(true);
    // Branch hash sorts the two children lexicographically.
    const [a, b] = [v.childLeafHash, v.guardianLeafHash].sort((x, y) => toHex(x).localeCompare(toHex(y)));
    const root = bcrypto.taggedHash('TapBranch', concatBytes(a, b));
    const tweak = bcrypto.taggedHash('TapTweak', concatBytes(v.internalKey, root));
    const tweaked = ecc.xOnlyPointAddTweak(v.internalKey, tweak);
    expect(tweaked).not.toBeNull();
    expect(toHex(tweaked!.xOnlyPubkey)).toBe(VECTOR.outputKey);
    // Control block: leaf version with parity, internal key, sibling hash.
    expect(v.guardianControlBlock.length).toBe(65);
    expect(v.guardianControlBlock[0]).toBe(0xc0 | tweaked!.parity);
    expect(toHex(v.guardianControlBlock.subarray(1, 33))).toBe(NUMS_INTERNAL_KEY_HEX);
    expect(toHex(v.guardianControlBlock.subarray(33))).toBe(VECTOR.childLeafHash);
    expect(toHex(v.childControlBlock.subarray(33))).toBe(VECTOR.guardianLeafHash);
    // The address is the P2TR encoding of the output key.
    expect(toHex(v.scriptPubKey)).toBe(`5120${VECTOR.outputKey}`);
    expect(btcAddress.fromOutputScript(v.scriptPubKey, getNetwork('signet'))).toBe(VECTOR.address);
    expect(v.address.startsWith('tb1p')).toBe(true);
  });

  it('builds the guardian leaf as a sorted 2-of-3 with OP_CHECKSIGADD after a CSV delay', () => {
    const v = vector();
    const chunks = bscript.decompile(v.guardianLeaf)!;
    expect(chunks[1]).toBe(opcodes.OP_CHECKSEQUENCEVERIFY);
    expect(chunks[2]).toBe(opcodes.OP_DROP);
    expect(chunks[4]).toBe(opcodes.OP_CHECKSIG);
    expect(chunks[6]).toBe(opcodes.OP_CHECKSIGADD);
    expect(chunks[8]).toBe(opcodes.OP_CHECKSIGADD);
    expect(chunks[9]).toBe(opcodes.OP_2);
    expect(chunks[10]).toBe(opcodes.OP_NUMEQUAL);
    const sorted = v.guardianKeys.map(toHex);
    expect(sorted).toEqual([...sorted].sort());
    expect(sorted).toEqual([VECTOR.foundation, VECTOR.familyGuardian, VECTOR.notary].map((h) => h.slice(2)));
    const decoded = decodeGuardianRecoveryLeaf(v.guardianLeaf);
    expect(decoded.recoveryDelayBlocks).toBe(GUARDIAN_RECOVERY_DELAY_BLOCKS);
    expect(decoded.guardianKeys.map(toHex)).toEqual(sorted);
  });

  it('gives the same address whatever the order of the guardian keys', () => {
    const k = keys();
    const shuffled = createTaprootVault(
      { childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: [k.notary, k.foundation, k.familyGuardian] },
      'signet',
    );
    expect(shuffled.address).toBe(VECTOR.address);
    const testnet = createTaprootVault(
      { childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: [k.notary, k.foundation, k.familyGuardian] },
      'testnet',
    );
    expect(testnet.address).toBe(VECTOR.address);
    const regtest = createTaprootVault(
      { childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: [k.notary, k.foundation, k.familyGuardian] },
      'regtest',
    );
    expect(regtest.address.startsWith('bcrt1p')).toBe(true);
  });

  it('keeps the child leaf identical to the v0 child path rule', () => {
    const v = vector();
    const chunks = bscript.decompile(v.childLeaf)!;
    expect(chunks[1]).toBe(opcodes.OP_CHECKLOCKTIMEVERIFY);
    expect(chunks[2]).toBe(opcodes.OP_DROP);
    expect(chunks[4]).toBe(opcodes.OP_CHECKSIG);
    // 2160172800 as a minimal script number (5 bytes, because the top bit of 0x80 is set).
    expect(toHex(chunks[0] as Uint8Array)).toBe('009fc18000');
    expect(toHex(chunks[3] as Uint8Array)).toBe(VECTOR.child.slice(2));
  });

  it('rejects bad parameters', () => {
    const k = keys();
    const g = [k.foundation, k.familyGuardian, k.notary];
    expect(() => createTaprootVault({ childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: g.slice(0, 2) }, 'signet')).toThrow(
      /Exactly 3/,
    );
    expect(() =>
      createTaprootVault({ childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: [k.foundation, k.foundation, k.notary] }, 'signet'),
    ).toThrow(/different/);
    expect(() =>
      createTaprootVault({ childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: [k.child, k.familyGuardian, k.notary] }, 'signet'),
    ).toThrow(/child key/);
    expect(() =>
      createTaprootVault({ childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: g, recoveryDelayBlocks: 0 }, 'signet'),
    ).toThrow(/recovery delay/);
    expect(() =>
      createTaprootVault({ childPubKey: k.child, unlockTime: TEST_UNLOCK_TIME, guardianPubKeys: g, recoveryDelayBlocks: 65_536 }, 'signet'),
    ).toThrow(/recovery delay/);
    expect(() => createTaprootVault({ childPubKey: k.child, unlockTime: 100, guardianPubKeys: g }, 'signet')).toThrow(/unlock time/);
    expect(() => buildChildLeaf(new Uint8Array(33), TEST_UNLOCK_TIME)).toThrow(/x-only/);
    expect(() => buildGuardianRecoveryLeaf([new Uint8Array(32)], 10)).toThrow(/Exactly 3/);
    expect(() => decodeGuardianRecoveryLeaf(vector().childLeaf)).toThrow(/guardian leaf/);
    expect(() => toXOnly(new Uint8Array(32))).toThrow(/compressed public key/);
  });
});
