import { describe, expect, it } from 'vitest';
import { TEST_BIRTH_DATE, TEST_UNLOCK_TIME, testVault } from './test-fixtures';
import { descriptorToJson, parseDescriptor, parseDescriptorJson, toDescriptor } from './vault';

describe('vault descriptor', () => {
  const vault = testVault();
  const descriptor = toDescriptor(vault, {
    label: 'Test child',
    birthDate: TEST_BIRTH_DATE,
    parentDerivationPath: "m/84'/1'/0'/0/0",
    childDerivationPath: "m/84'/1'/0'/0/0",
  });

  it('exports public data only', () => {
    expect(Object.keys(descriptor).sort()).toEqual(
      [
        'address',
        'birthDate',
        'childDerivationPath',
        'childPubKey',
        'label',
        'network',
        'parentDerivationPath',
        'parentPubKey',
        'type',
        'unlockDate',
        'unlockTime',
        'version',
        'witnessScript',
      ].sort(),
    );
    expect(descriptor.unlockDate).toBe('2038-06-15T00:00:00.000Z');
  });

  it('round trips through JSON', () => {
    const { vault: again, descriptor: d2 } = parseDescriptorJson(descriptorToJson(descriptor));
    expect(again.address).toBe(vault.address);
    expect(again.unlockTime).toBe(TEST_UNLOCK_TIME);
    expect(d2).toEqual(descriptor);
  });

  it('rejects files whose script or address do not match the keys', () => {
    expect(() => parseDescriptor({ ...descriptor, unlockTime: TEST_UNLOCK_TIME + 1 })).toThrow(/witness script/);
    expect(() =>
      parseDescriptor({ ...descriptor, address: 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl' }),
    ).toThrow(/address/);
    expect(() => parseDescriptor({ ...descriptor, parentPubKey: descriptor.childPubKey })).toThrow();
  });

  it('rejects other files', () => {
    expect(() => parseDescriptorJson('not json')).toThrow(/JSON/);
    expect(() => parseDescriptor([])).toThrow(/object/);
    expect(() => parseDescriptor({ ...descriptor, type: 'other' })).toThrow(/not a Kids Wallet/);
    expect(() => parseDescriptor({ ...descriptor, version: 2 })).toThrow(/version/);
    expect(() => parseDescriptor({ ...descriptor, network: 'litecoin' })).toThrow(/network/);
    expect(() => parseDescriptor({ ...descriptor, label: 'x'.repeat(61) })).toThrow(/label/);
    expect(() => parseDescriptor({ ...descriptor, parentDerivationPath: 'm/../x' })).toThrow(/derivation/);
  });
});
