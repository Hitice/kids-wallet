# RFC 0004: Device biometrics and passkeys

Status: Open

## Summary

Biometrics (iris, face, fingerprint) are the child's way to unlock the app and
authorize an action on their own device. They go through platform biometrics:
WebAuthn passkeys on the web, Face ID and Touch ID on Apple devices, the
Android biometric prompt on Android. They are never key material and never
leave the device.

## Motivation

A young child cannot type a strong password. A face or a fingerprint is the
natural way for them to say "this is me" to their own tablet. The early idea
of this project was to derive the wallet itself from the child's face and date
of birth. That is rejected for good, for the reasons below.

## Why biometrics are never the key

Biometric templates are not secret and cannot be changed if leaked: a face is
photographed every day, and nobody can be issued a new one. A camera or sensor
reading is also not bit-identical across time, light and device, while a key
must be exactly the same bits every time, so any key "derived" from a face is
either unstable or reduced to something far weaker than a random key.

There is a legal reason as well. Biometric data of minors is sensitive personal
data under the Brazilian LGPD (article 11, with article 14 on children) and
special category data under the EU GDPR (article 9). Keeping it on the device,
inside the platform's secure hardware, means Kids Wallet never collects,
stores or transmits it.

## Design

- The signing share on the child's device ([RFC 0003](0003-threshold-child-key-and-growth-ceremonies.md))
  is encrypted at rest. On the web it is encrypted with a key derived from a
  WebAuthn PRF extension output (where supported); on native platforms it is
  stored in the Keychain or Android Keystore with a biometric access control.
- Unlocking means: the platform shows its own biometric prompt, the platform
  releases the key or the PRF output, the app decrypts the share in memory.
- The app never receives a biometric template, an image or a score. It only
  learns "the platform said yes".
- Every signing action (a ceremony step, the hand-over transaction) asks for a
  fresh platform authorization, not only the app unlock.
- A fallback is the device PIN or a passkey on another device of the child.
  Losing the device does not lose funds: the share is rebuilt in the next
  ceremony from the other holders.

## Enforced by code vs by governance

| Rule | Enforced by |
| --- | --- |
| Biometric data never leaves the device | Platform APIs (WebAuthn, LocalAuthentication, BiometricPrompt): the app has no access to templates |
| A share cannot be used without user presence | Platform key storage with user verification |
| No biometric data is collected by Kids Wallet | Client code and the absence of any backend that could receive it |

## Open questions

1. WebAuthn PRF support varies by browser and authenticator. What is the web
   fallback when PRF is missing?
2. Shared family tablets: one passkey per child profile, or no shares at all on
   shared devices?
3. Age at which the child's own passkey replaces a parent-assisted unlock.

## History

- 2026-11-02: first draft. Records the decision that biometrics are never key
  material.
