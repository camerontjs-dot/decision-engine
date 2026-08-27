# Decision Engine RC1 Open Questions

- Is the Gate primitive the entire reusable kernel?
- Is `promote | hold | reject` generic enough, or should action labels live only in policy packs?
- Which unknown reasons need typed semantics?
- Should MainFrame document-hygiene and CAL-audit gates remain separate stages?
- Can DMN/OPA-style policy machinery reduce custom assurance burden?
- Does any Contract-C consumer actually need select/rank geometry?
- Should `decision-engine` become a generic runtime, a collection of decision applications, or be narrowed if standard policy infrastructure is sufficient?
