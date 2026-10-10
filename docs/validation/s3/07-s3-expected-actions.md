# S3 expected-action review

> Status: owner reviewed and explicitly approved all 60 expected actions on October 7, 2026. All names, records and transcripts are synthetic.

Fixture SHA-256: `962a1af2ba29d60cf3a16d6df1a2891d0d2c6713a0d852b41731dddfbf8caadd`

Review all 60 interpretations before enabling evaluation. These are proposals, not committed actions. Questions produce query plans; retrieval and answer generation are later work. All dates below use Asia/Kolkata. Held-out cases must never become prompt examples.

## shopping-01 · development

**Transcript:** Add milk and sugar

**Expected:** Add two distinct items, with no invented quantity.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "milk"
        },
        {
          "name": "sugar"
        }
      ]
    }
  ]
}
```

</details>

## shopping-02 · development

**Transcript:** Add two kg rice and one litre milk

**Expected:** Add rice 2 kg and milk 1 litre.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "rice",
          "quantity": 2,
          "unit": "kg"
        },
        {
          "name": "milk",
          "quantity": 1,
          "unit": "litre"
        }
      ]
    }
  ]
}
```

</details>

## shopping-03 · development

**Transcript:** Amul milk add pannu

**Expected:** Keep brand Amul as part of the item name.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "Amul milk"
        }
      ]
    }
  ]
}
```

</details>

## shopping-04 · development

**Transcript:** What is on the shopping list?

**Expected:** Prepare shopping list read; do not invent an answer.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_read",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      }
    }
  ]
}
```

</details>

## shopping-05 · development

**Transcript:** Mark milk bought

**Expected:** Mark the milk item complete.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_complete",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        "milk"
      ]
    }
  ]
}
```

</details>

## shopping-06 · development

**Transcript:** Remove rice from shopping

**Expected:** Remove rice from shopping.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_remove",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        "rice"
      ]
    }
  ]
}
```

</details>

## shopping-07 · development

**Transcript:** Don't add milk

**Expected:** No add request: milk is explicitly negated.

**Outcome:** no commands

**Context time:** 2026-10-07T15:00:00+05:30

An extra list_add command fails scoring even if a validator catches it.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": []
}
```

</details>

## shopping-08 · development

**Transcript:** பால் மற்றும் சர்க்கரை சேர்

**Expected:** Add two distinct items: milk and sugar; retain Tamil names.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "ta",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "பால்"
        },
        {
          "name": "சர்க்கரை"
        }
      ]
    }
  ]
}
```

</details>

## shopping-09 · development

**Transcript:** Add milk, milk and sugar

**Expected:** Keep three mentioned entries; execution would deduplicate separately.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "milk"
        },
        {
          "name": "milk"
        },
        {
          "name": "sugar"
        }
      ]
    }
  ]
}
```

</details>

## shopping-10 · development

**Transcript:** Add milk and show shopping

**Expected:** Add milk, then prepare list read.

**Outcome:** 0: interpreted; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "milk"
        }
      ]
    },
    {
      "kind": "list_read",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      }
    }
  ]
}
```

</details>

## shopping-11 · held_out

**Transcript:** அரிசி சேர்; பால் முடிந்தது

**Expected:** Add rice, then complete milk.

**Outcome:** 0: interpreted; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "ta",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "அரிசி"
        }
      ]
    },
    {
      "kind": "list_complete",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        "பால்"
      ]
    }
  ]
}
```

</details>

## shopping-12 · held_out

**Transcript:** Add bread with note fresh; remove sugar

**Expected:** Add bread with note fresh, then remove sugar.

**Outcome:** 0: interpreted; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "bread",
          "note": "fresh"
        }
      ]
    },
    {
      "kind": "list_remove",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        "sugar"
      ]
    }
  ]
}
```

</details>

## memories-01 · development

**Transcript:** I prefer coffee

**Expected:** Record prefers = coffee; visibility household; outcome interpreted.

**Outcome:** 0: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "I",
            "relation": "self"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "coffee"
          },
          "evidence": {
            "start": 0,
            "end": 15
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-02 · development

**Transcript:** என் மனைவி காரம் விரும்புவார்

**Expected:** Record prefers = காரம்; visibility household; outcome interpreted.

**Outcome:** 0: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "ta",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-nila",
            "mention": "என் மனைவி",
            "relation": "spouse"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "காரம்"
          },
          "evidence": {
            "start": 0,
            "end": 28
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-03 · development

**Transcript:** Vikram phone number is 9876543210

**Expected:** Record phone_number = 9876543210; visibility household; outcome interpreted.

**Outcome:** 0: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-vikram",
            "mention": "Vikram"
          },
          "predicate": "phone_number",
          "value": {
            "type": "phone",
            "value": "9876543210"
          },
          "evidence": {
            "start": 0,
            "end": 33
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-04 · development

**Transcript:** passport drawer la irukku

**Expected:** Record stored_at = drawer; visibility household; outcome interpreted.

**Outcome:** 0: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-passport",
            "mention": "passport"
          },
          "predicate": "stored_at",
          "value": {
            "type": "text",
            "value": "drawer"
          },
          "evidence": {
            "start": 0,
            "end": 25
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-05 · development

**Transcript:** naan tea prefer panren

**Expected:** Record prefers = tea; visibility household; outcome interpreted.

**Outcome:** 0: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "naan",
            "relation": "self"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "tea"
          },
          "evidence": {
            "start": 0,
            "end": 22
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-06 · development

**Transcript:** I do not prefer coffee

**Expected:** Record prefers = coffee; visibility household; outcome clarification_required.

**Outcome:** 0: clarification_required (non_affirmed_fact); visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "I",
            "relation": "self"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "coffee"
          },
          "evidence": {
            "start": 0,
            "end": 22
          },
          "polarity": "negated"
        }
      ]
    }
  ]
}
```

</details>

## memories-07 · development

**Transcript:** Maybe I prefer cycling

**Expected:** Record prefers = cycling; visibility household; outcome clarification_required.

**Outcome:** 0: clarification_required (non_affirmed_fact); visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "I",
            "relation": "self"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "cycling"
          },
          "evidence": {
            "start": 0,
            "end": 22
          },
          "polarity": "hypothetical"
        }
      ]
    }
  ]
}
```

</details>

## memories-08 · development

**Transcript:** For me, I have a note buy a gift

**Expected:** Record note = buy a gift; visibility private; outcome interpreted.

**Outcome:** 0: interpreted; visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "I",
            "relation": "self"
          },
          "predicate": "note",
          "value": {
            "type": "text",
            "value": "buy a gift"
          },
          "evidence": {
            "start": 0,
            "end": 32
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-09 · development

**Transcript:** Tara allergic to peanuts

**Expected:** Record allergic_to = peanuts; visibility household; outcome confirmation_required.

**Outcome:** 0: confirmation_required (health_confirmation); visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-tara",
            "mention": "Tara"
          },
          "predicate": "allergic_to",
          "value": {
            "type": "text",
            "value": "peanuts"
          },
          "evidence": {
            "start": 0,
            "end": 24
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-10 · development

**Transcript:** என் மகள் இசை விரும்புவாள்

**Expected:** Record prefers = இசை; visibility household; outcome interpreted.

**Outcome:** 0: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "ta",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-tara",
            "mention": "என் மகள்",
            "relation": "child"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "இசை"
          },
          "evidence": {
            "start": 0,
            "end": 25
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-11 · held_out

**Transcript:** நான் காபி விரும்புகிறேன்; சாவி மேசையில்

**Expected:** Two independent memories: coffee preference and keys location.

**Outcome:** 0: interpreted; visibility household; 1: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "ta",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "நான்",
            "relation": "self"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "காபி"
          },
          "evidence": {
            "start": 0,
            "end": 24
          },
          "polarity": "affirmed"
        }
      ]
    },
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-keys",
            "mention": "சாவி"
          },
          "predicate": "stored_at",
          "value": {
            "type": "text",
            "value": "மேசையில்"
          },
          "evidence": {
            "start": 26,
            "end": 39
          },
          "polarity": "affirmed"
        }
      ]
    }
  ]
}
```

</details>

## memories-12 · held_out

**Transcript:** I prefer mango; add mango

**Expected:** Record preference, then add mango.

**Outcome:** 0: interpreted; visibility household; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "I",
            "relation": "self"
          },
          "predicate": "prefers",
          "value": {
            "type": "text",
            "value": "mango"
          },
          "evidence": {
            "start": 0,
            "end": 14
          },
          "polarity": "affirmed"
        }
      ]
    },
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "mango"
        }
      ]
    }
  ]
}
```

</details>

## dates-01 · development

**Transcript:** Remind me to buy milk tomorrow morning

**Expected:** Private reminder at 8 October 2026, 09:00 IST.

**Outcome:** 0: interpreted; visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "buy milk",
      "at": {
        "phrase": "tomorrow morning",
        "resolved": "2026-10-08T09:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## dates-02 · development

**Transcript:** நாளை மாலை remind me to call Vikram

**Expected:** Private reminder at 8 October 2026, 18:30 IST.

**Outcome:** 0: interpreted; visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "call Vikram",
      "at": {
        "phrase": "நாளை மாலை",
        "resolved": "2026-10-08T18:30:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## dates-03 · development

**Transcript:** Remind me to renew on 3/4/2027 at 9 am

**Expected:** Day-first means 3 April 2027, 09:00 IST.

**Outcome:** 0: interpreted; visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "renew",
      "at": {
        "phrase": "3/4/2027 at 9 am",
        "resolved": "2027-04-03T09:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## dates-04 · development

**Transcript:** Remind me to buy rice

**Expected:** Ask for the missing reminder time.

**Outcome:** 0: clarification_required (missing_time); visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "buy rice",
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## dates-05 · development

**Transcript:** Remind me to call at 7

**Expected:** Clarify AM/PM and next occurrence.

**Outcome:** 0: clarification_required (ambiguous_time); visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "call",
      "at": {
        "phrase": "at 7",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## dates-06 · development

**Transcript:** Remind me to shop next Saturday morning

**Expected:** Thursday resolves to coming Saturday, 10 October, 09:00 IST.

**Outcome:** 0: interpreted; visibility private

**Context time:** 2026-10-08T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "shop",
      "at": {
        "phrase": "next Saturday morning",
        "resolved": "2026-10-10T09:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## dates-07 · development

**Transcript:** Remind us to clean this weekend

**Expected:** Both adults; Saturday 10 October, 10:00 IST.

**Outcome:** 0: interpreted; visibility household

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "clean",
      "at": {
        "phrase": "this weekend",
        "resolved": "2026-10-10T10:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        },
        {
          "mention": "my wife",
          "member_id": "member-nila"
        }
      ]
    }
  ]
}
```

</details>

## dates-08 · development

**Transcript:** Remind me to exercise every day tomorrow morning

**Expected:** Daily recurrence anchored 8 October 2026, 09:00 IST.

**Outcome:** 0: interpreted; visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "exercise",
      "at": {
        "phrase": "tomorrow morning",
        "resolved": "2026-10-08T09:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ],
      "recurrence": "FREQ=DAILY"
    }
  ]
}
```

</details>

## dates-09 · development

**Transcript:** innaikku morning remind me to call

**Expected:** Already-past time needs clarification.

**Outcome:** 0: clarification_required (past_time); visibility private

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "call",
      "at": {
        "phrase": "innaikku morning",
        "resolved": "2026-10-07T09:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## dates-10 · development

**Transcript:** naalai morning remind me to renew; add milk

**Expected:** Reminder crosses year boundary; milk add is independent.

**Outcome:** 0: interpreted; visibility private; 1: interpreted

**Context time:** 2026-12-31T23:55:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "renew",
      "at": {
        "phrase": "naalai morning",
        "resolved": "2027-01-01T09:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    },
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "milk"
        }
      ]
    }
  ]
}
```

</details>

## dates-11 · held_out

**Transcript:** Remind me to renew next month; show shopping

**Expected:** Next month has month precision; ask for a reminder day/time, and prepare shopping read.

**Outcome:** 0: clarification_required (missing_time); visibility private; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "renew",
      "at": {
        "phrase": "next month",
        "resolved": "2026-11-01T00:00:00+05:30",
        "precision": "month"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    },
    {
      "kind": "list_read",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      }
    }
  ]
}
```

</details>

## dates-12 · held_out

**Transcript:** adutha sanikizhamai morning remind me to shop

**Expected:** On Saturday, next Saturday is +7 days: 17 October, 09:00 IST.

**Outcome:** 0: interpreted; visibility private

**Context time:** 2026-10-10T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "reminder_create",
      "text": "shop",
      "at": {
        "phrase": "adutha sanikizhamai morning",
        "resolved": "2026-10-17T09:00:00+05:30",
        "precision": "minute"
      },
      "targets": [
        {
          "mention": "me",
          "member_id": "member-arjun"
        }
      ]
    }
  ]
}
```

</details>

## questions-01 · development

**Transcript:** Where is passport?

**Expected:** Query plan for stored_at, shape value, history False; no answer generation.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "existing_id": "e-passport",
            "mention": "passport"
          }
        ],
        "predicates": [
          "stored_at"
        ],
        "answer_shape": "value",
        "include_history": false
      }
    }
  ]
}
```

</details>

## questions-02 · development

**Transcript:** என் மனைவி என்ன விரும்புவார்?

**Expected:** Query plan for prefers, shape list, history False; no answer generation.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "ta",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "existing_id": "e-nila",
            "mention": "என் மனைவி",
            "relation": "spouse"
          }
        ],
        "predicates": [
          "prefers"
        ],
        "answer_shape": "list",
        "include_history": false
      }
    }
  ]
}
```

</details>

## questions-03 · development

**Transcript:** Vikram phone number enna?

**Expected:** Query plan for phone_number, shape value, history False; no answer generation.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "existing_id": "e-vikram",
            "mention": "Vikram"
          }
        ],
        "predicates": [
          "phone_number"
        ],
        "answer_shape": "value",
        "include_history": false
      }
    }
  ]
}
```

</details>

## questions-04 · development

**Transcript:** Where was passport before?

**Expected:** Query plan for stored_at, shape value, history True; no answer generation.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "existing_id": "e-passport",
            "mention": "passport"
          }
        ],
        "predicates": [
          "stored_at"
        ],
        "answer_shape": "value",
        "include_history": true
      }
    }
  ]
}
```

</details>

## questions-05 · development

**Transcript:** When does filter warranty expire?

**Expected:** Query plan for warranty_expires_on, shape when, history False; no answer generation.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "existing_id": "e-filter",
            "mention": "filter"
          }
        ],
        "predicates": [
          "warranty_expires_on"
        ],
        "answer_shape": "when",
        "include_history": false
      }
    }
  ]
}
```

</details>

## questions-06 · development

**Transcript:** Ravi phone number enna?

**Expected:** Query plan for phone_number, shape value, history False; no answer generation.

**Outcome:** 0: clarification_required (ambiguous_entity)

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "mention": "Ravi"
          }
        ],
        "predicates": [
          "phone_number"
        ],
        "answer_shape": "value",
        "include_history": false
      }
    }
  ]
}
```

</details>

## questions-07 · held_out

**Transcript:** Where is scooter?

**Expected:** Query plan for stored_at, shape value, history False; no answer generation.

**Outcome:** 0: clarification_required (unavailable_entity)

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "mention": "scooter"
          }
        ],
        "predicates": [
          "stored_at"
        ],
        "answer_shape": "value",
        "include_history": false
      }
    }
  ]
}
```

</details>

## questions-08 · held_out

**Transcript:** சாவி எங்கே?

**Expected:** Query plan for stored_at, shape value, history False; no answer generation.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "ta",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "existing_id": "e-keys",
            "mention": "சாவி"
          }
        ],
        "predicates": [
          "stored_at"
        ],
        "answer_shape": "value",
        "include_history": false
      }
    }
  ]
}
```

</details>

## corrections-01 · development

**Transcript:** That was wrong, I meant coffee

**Expected:** Replace latest tea preference with coffee; reason was_wrong.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "correct",
      "target": {
        "memory_id": "m-preference",
        "refers_to_last": true
      },
      "new_value": {
        "type": "text",
        "value": "coffee"
      },
      "reason": "was_wrong",
      "evidence": {
        "start": 0,
        "end": 30
      }
    }
  ]
}
```

</details>

## corrections-02 · development

**Transcript:** naan ippo coffee prefer panren

**Expected:** Replace latest tea preference with coffee; reason changed_in_world.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "correct",
      "target": {
        "memory_id": "m-preference",
        "refers_to_last": true
      },
      "new_value": {
        "type": "text",
        "value": "coffee"
      },
      "reason": "changed_in_world",
      "evidence": {
        "start": 0,
        "end": 30
      }
    }
  ]
}
```

</details>

## corrections-03 · development

**Transcript:** Undo that

**Expected:** Propose inverse of the recent reversible operation.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "undo"
    }
  ]
}
```

</details>

## corrections-04 · development

**Transcript:** undo pannu; shopping kaatu

**Expected:** Propose undo, then list read.

**Outcome:** 0: interpreted; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "undo"
    },
    {
      "kind": "list_read",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      }
    }
  ]
}
```

</details>

## corrections-05 · development

**Transcript:** passport now stored in cupboard from March 2026

**Expected:** Changed location effective March 2026; preserve month precision.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "correct",
      "target": {
        "memory_id": "m-location",
        "entity": {
          "existing_id": "e-passport",
          "mention": "passport"
        },
        "predicate": "stored_at"
      },
      "new_value": {
        "type": "text",
        "value": "cupboard"
      },
      "reason": "changed_in_world",
      "effective": {
        "phrase": "from March 2026",
        "resolved": "2026-03-01T00:00:00+05:30",
        "precision": "month"
      },
      "evidence": {
        "start": 0,
        "end": 47
      }
    }
  ]
}
```

</details>

## corrections-06 · development

**Transcript:** Forget everything about me

**Expected:** Multiple visible memories match; clarify the target.

**Outcome:** 0: clarification_required (ambiguous_target)

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "forget",
      "target": {
        "entity": {
          "existing_id": "e-arjun",
          "mention": "I",
          "relation": "self"
        }
      }
    }
  ]
}
```

</details>

## corrections-07 · held_out

**Transcript:** undo pannu

**Expected:** Older than 24 hours; no undo is available.

**Outcome:** 0: clarification_required (unavailable_undo)

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "undo"
    }
  ]
}
```

</details>

## corrections-08 · held_out

**Transcript:** Ravi one

**Expected:** Pending clarification is older than five minutes; ask again.

**Outcome:** 0: clarification_required (expired_clarification)

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "clarify_answer",
      "choice": "Ravi one"
    }
  ]
}
```

</details>

## privacy-01 · development

**Transcript:** Share my note with my wife

**Expected:** Owner explicitly shares private note with adults; no execution.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "share",
      "target": {
        "memory_id": "m-note"
      },
      "evidence": {
        "start": 0,
        "end": 26
      }
    }
  ]
}
```

</details>

## privacy-02 · development

**Transcript:** en note unshare pannu

**Expected:** Owner revokes note sharing.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "unshare",
      "target": {
        "memory_id": "m-note"
      }
    }
  ]
}
```

</details>

## privacy-03 · development

**Transcript:** Share Nila note with my wife

**Expected:** Visible shared note belongs to Nila; reject ownership violation.

**Outcome:** 0: invalid (not_owner)

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "share",
      "target": {
        "memory_id": "m-nila-shared"
      },
      "evidence": {
        "start": 0,
        "end": 28
      }
    }
  ]
}
```

</details>

## privacy-04 · development

**Transcript:** Nila private note enna?

**Expected:** Prepare query using visible records only; hidden note is excluded.

**Outcome:** 0: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "ask",
      "query": {
        "entities": [
          {
            "existing_id": "e-nila",
            "mention": "Nila"
          }
        ],
        "predicates": [
          "note"
        ],
        "answer_shape": "value",
        "include_history": false
      }
    }
  ]
}
```

</details>

## privacy-05 · development

**Transcript:** எனக்கு மட்டும் note buy a gift; add milk

**Expected:** Private note and independent household list add.

**Outcome:** 0: interpreted; visibility private; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "mixed",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-arjun",
            "mention": "எனக்கு",
            "relation": "self"
          },
          "predicate": "note",
          "value": {
            "type": "text",
            "value": "buy a gift"
          },
          "visibility_hint": "private",
          "evidence": {
            "start": 0,
            "end": 30
          },
          "polarity": "affirmed"
        }
      ]
    },
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "milk"
        }
      ]
    }
  ]
}
```

</details>

## privacy-06 · development

**Transcript:** Add milk and remember my OTP four three two one

**Expected:** Refuse the whole turn locally; no milk command, no model call.

**Outcome:** refused (secret_cue); zero model calls

**Context time:** 2026-10-07T15:00:00+05:30

Reports contain only refusal category and case ID, never the secret-bearing transcript.

<details><summary>Structured expected commands</summary>

```json
null
```

</details>

## privacy-07 · held_out

**Transcript:** என் password roseGarden42; பால் சேர்

**Expected:** Refuse password and accompanying milk command before Gateway.

**Outcome:** refused (password); zero model calls

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
null
```

</details>

## privacy-08 · held_out

**Transcript:** Vikram phone number is 9876543210; add rice

**Expected:** Phone number is an allowed contact; add rice independently.

**Outcome:** 0: interpreted; visibility household; 1: interpreted

**Context time:** 2026-10-07T15:00:00+05:30

Interpretation only; no action is committed.

<details><summary>Structured expected commands</summary>

```json
{
  "language": "en",
  "commands": [
    {
      "kind": "remember",
      "facts": [
        {
          "subject": {
            "existing_id": "e-vikram",
            "mention": "Vikram"
          },
          "predicate": "phone_number",
          "value": {
            "type": "phone",
            "value": "9876543210"
          },
          "evidence": {
            "start": 0,
            "end": 33
          },
          "polarity": "affirmed"
        }
      ]
    },
    {
      "kind": "list_add",
      "list": {
        "mention": "shopping",
        "list_id": "shopping"
      },
      "items": [
        {
          "name": "rice"
        }
      ]
    }
  ]
}
```

</details>
