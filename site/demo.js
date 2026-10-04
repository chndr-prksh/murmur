// Sample forecast shown when no backend is configured. Hand-written estimates,
// not model output; the page labels it as a sample wherever it appears.
window.MURMUR_DEMO = {
  id: 'sample',
  question: 'What if Google announces it will not pause its push toward artificial general intelligence?',
  created_at: '2026-10-04T00:00:00Z',
  horizon_days: 14,
  summary:
    'A small, short-lived reaction. Expect a few days of press and loud condemnation from AI safety groups, with no change in course. The announcement mostly restates a mission Google DeepMind has held for years, which lowers the shock.',
  outcomes: [
    { label: 'Safety organisations publish an open letter or joint statement within 2 weeks', p: 0.7, lo: 0.6, hi: 0.8, rationale: 'Every comparable declaration since 2023 has drawn one.' },
    { label: 'A US or EU legislator publicly cites it within a week', p: 0.6, lo: 0.48, hi: 0.7, rationale: 'AI statements by large labs are routinely picked up in hearings and posts.' },
    { label: 'A rival lab CEO makes a matching public statement within a month', p: 0.5, lo: 0.38, hi: 0.62, rationale: 'Meta and OpenAI both escalated their own language in 2024 and 2025.' },
    { label: 'A notable Google researcher resigns citing it within a month', p: 0.15, lo: 0.08, hi: 0.22, rationale: 'Possible, but the stance is not new to staff.' },
    { label: 'An employee petition passes 1,000 signatures', p: 0.1, lo: 0.05, hi: 0.16, rationale: 'Employee leverage fell sharply after the 2024 dismissals.' },
    { label: 'Share price moves more than 3% on the day because of it', p: 0.1, lo: 0.05, hi: 0.15, rationale: 'Investors react to spending figures, not mission statements.' },
    { label: 'Binding regulation follows within 6 months as a direct result', p: 0.04, lo: 0.02, hi: 0.07, rationale: 'No prior lab statement has produced this.' },
    { label: 'Google walks the statement back', p: 0.02, lo: 0.01, hi: 0.04, rationale: 'It did not reverse after the 2025 weapons-pledge criticism.' },
  ],
  segments: [
    { name: 'General public', share: 0.62, reach: 0.18, support: 0.15, oppose: 0.35, amplify: 0.02, reaction: 'Mostly unaware. Those who hear lean uneasy, but few act.' },
    { name: 'Students and academics', share: 0.14, reach: 0.35, support: 0.3, oppose: 0.35, amplify: 0.06, reaction: 'Split between excitement and concern; debate stays on campus and forums.' },
    { name: 'Tech workers', share: 0.12, reach: 0.55, support: 0.4, oppose: 0.25, amplify: 0.08, reaction: 'Largely expected it. More approval than objection.' },
    { name: 'Investors', share: 0.08, reach: 0.5, support: 0.55, oppose: 0.1, amplify: 0.05, reaction: 'Reads as commitment. Attention goes to the spending behind it.' },
    { name: 'Policymakers and staff', share: 0.02, reach: 0.6, support: 0.15, oppose: 0.45, amplify: 0.1, reaction: 'Used as evidence in existing arguments for oversight.' },
    { name: 'AI safety community', share: 0.01, reach: 0.95, support: 0.03, oppose: 0.9, amplify: 0.45, reaction: 'Near-universal condemnation and heavy posting.' },
    { name: 'Journalists and media', share: 0.01, reach: 0.9, support: 0.2, oppose: 0.35, amplify: 0.5, reaction: 'Covers it for two to four days, then moves on.' },
  ],
  analogues: [
    { event: '"Pause Giant AI Experiments" open letter', year: 2023, what_happened: 'Tens of thousands signed; no lab paused and coverage faded within about two weeks.' },
    { event: 'Meta and OpenAI commit publicly to AGI and superintelligence', year: 2025, what_happened: 'Criticism from safety researchers; investors focused on spending.' },
    { event: 'Google drops its AI weapons pledge', year: 2025, what_happened: 'Objections from rights groups and some staff; brief news cycle; no reversal.' },
    { event: 'Google dismisses staff protesting a cloud contract', year: 2024, what_happened: 'Around 50 employees fired, signalling reduced tolerance for internal protest.' },
  ],
  drivers: [
    'Timing: coming right after a serious AI incident would raise every reaction.',
    'Target: refusing a government request, not an activist letter, raises regulatory odds most.',
    'Wording: "superintelligence" draws more backlash than "AGI".',
  ],
  sources: [],
  meta: { model: 'hand-written sample', samples: 0, searches: 0, demo: true },
};
