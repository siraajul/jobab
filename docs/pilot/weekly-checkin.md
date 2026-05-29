# Weekly Check-in — 15 minutes

Run this WhatsApp / phone call every Friday at the same time. Keep it
short. If they want to vent, let them. If they're satisfied, ask one
sharper question.

## Standard 4 questions

1. **"Ei shoptahe Jobab kotodin theke bothike thik chiltho?"**
   (How many days did Jobab work right this week?)

2. **"Ek baar kichu kharap korlo Jobab? Ki holo?"**
   (One time Jobab messed up? What happened?)

3. **"Kotodin save holo apnar shomoy?"**
   (How many hours did it save you?) — push for a number, not "onek"

4. **"Eta jodi taka deyay hoy, koto deyte chai?"** (week 3+ only)
   (If this cost money, how much would you pay?)

## Red flags

- "Customer ke barbar amake nije reply dite hochhe" → autonomy ratio dropped
- "Bhul jinis bole feleche" → quality regression, check Langfuse traces
- "Customer angry" → trust event, prioritise root cause
- "Bondho kore rekhe diyechi" → near-churn, escalate

## Green flags

- They volunteer a customer name + story without prompting
- They mention saving time in a specific evening / week scenario
- They ask "kobe theke charge korben?" (when do you start charging?)
- They refer a friend without being asked

## After the call

Log to `pilot_event` table:
```
type: weekly_checkin
metadata: { hoursSaved, mishaps[], wtp, sentiment: 'positive|neutral|negative' }
```

If 2 of 3 merchants give the same complaint two weeks in a row, escalate
to the engineering team as a P1.
