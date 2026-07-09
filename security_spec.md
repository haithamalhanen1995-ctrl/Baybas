# Security Specification: PUBG Bypass Premium

## 1. Data Invariants
- **LicenseKeys**: Must contain non-empty `id`, `key`, and valid types (`24h`, `7d`, `30d`, `lifetime`). The status must only transition between `unused`, `active`, and `expired`.
- **SupportTickets**: Must restrict the choice of platform to `Telegram` or `WhatsApp` and status to `pending` or `completed`.
- **BypassConfig**: Represents the singleton system status and must prevent arbitrary field injection.
- **LiveActivities**: Must record operational logging. Must strictly validate that types are `success`, `warning`, or `info`.

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: LicenseKey with Malicious String ID (ID Poisoning)
```json
{
  "id": "A_VERY_LONG_STRING_THAT_EXCEEDS_128_CHARACTERS_TO_DENIAL_OF_WALLET_ATTACK_RECURSIVELY_..._REPEATED_UNTIL_LIMIT",
  "key": "XYZ-123",
  "type": "lifetime",
  "status": "unused",
  "createdAt": "2026-07-08"
}
```

### Payload 2: LicenseKey with Invalid Status (State Bypass)
```json
{
  "id": "key_1",
  "key": "XYZ-123",
  "type": "lifetime",
  "status": "malicious_status_field",
  "createdAt": "2026-07-08"
}
```

### Payload 3: LicenseKey with Missing Required Fields (Schema Invariant Bypass)
```json
{
  "id": "key_2"
}
```

### Payload 4: LicenseKey with Invalid Type (Type Bypass)
```json
{
  "id": "key_3",
  "key": "XYZ-123",
  "type": "unlimited_gold",
  "status": "unused",
  "createdAt": "2026-07-08"
}
```

### Payload 5: SupportTicket Platform Hijacking
```json
{
  "id": "ticket_1",
  "username": "attacker",
  "platform": "Discord",
  "contact": "attacker_contact",
  "status": "pending",
  "createdAt": "2026-07-08"
}
```

### Payload 6: SupportTicket Status Overwrite (State Shortcutting)
```json
{
  "id": "ticket_2",
  "username": "attacker",
  "platform": "Telegram",
  "contact": "attacker_contact",
  "status": "hacked_status",
  "createdAt": "2026-07-08"
}
```

### Payload 7: SupportTicket Missing Platform Required (Schema Bypass)
```json
{
  "id": "ticket_3",
  "username": "attacker",
  "contact": "attacker_contact",
  "status": "pending",
  "createdAt": "2026-07-08"
}
```

### Payload 8: BypassConfig Injecting Ghost Fields (Shadow Update)
```json
{
  "gameLoopActive": true,
  "ldPlayerActive": true,
  "mumuPlayerActive": true,
  "antiCheatState": "active",
  "securityProtocol": "v2",
  "gameVersion": "3.2.0",
  "bypassStatus": "stable",
  "clientVersion": "1.0",
  "ghostField": "malicious_injection"
}
```

### Payload 9: BypassConfig with Invalid State
```json
{
  "gameLoopActive": true,
  "ldPlayerActive": true,
  "mumuPlayerActive": true,
  "antiCheatState": "offline_and_bypassed",
  "securityProtocol": "v2",
  "gameVersion": "3.2.0",
  "bypassStatus": "stable",
  "clientVersion": "1.0"
}
```

### Payload 10: LiveActivity with Malicious Status
```json
{
  "id": "act_1",
  "user": "attacker",
  "action": "hijack",
  "time": "now",
  "status": "super_admin"
}
```

### Payload 11: LiveActivity with Maliciously Sized Action Text
```json
{
  "id": "act_2",
  "user": "attacker",
  "action": "A_VERY_LONG_STRING_REPEATED_TO_WASTE_STORAGE_AND_INCREASE_IO_FEES_...",
  "time": "now",
  "status": "info"
}
```

### Payload 12: Invalid Path Variable Poisoning
Target Path: `/licenseKeys/invalid%20key%20with%20spaces`

---

## 3. The Test Runner Simulation Configuration

The security assertions are completely validated by the strict schema validation assertions in our `/firestore.rules` configuration. Every payload is denied by matching the exact JSON type schema, enum sets, and size bounds.
