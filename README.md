# The Cooperation Dilemma

A game theory simulation exploring how punishment, learning, and social institutions can transform defectors into cooperators.

## Overview

This simulation models the classic problem of cooperation in mixed populations: what happens when trusting cooperators (Hobbits) interact with habitual defectors (Orcs)? More importantly, **can punishment and learning mechanisms reform defectors without destroying them?**

The simulation demonstrates that:
- Zero violence leads to exploitation and collapse
- Excessive violence leads to extinction
- **Moderate, graduated punishment combined with learning creates stable cooperation**

This mirrors real-world findings about criminal justice, international relations, and institutional design.

## Core Mechanics

### The Agents

| Agent | Default Behavior | Nature |
|-------|------------------|--------|
| 🧑‍🌾 **Hobbits** | Always cooperate | Trusting, prosocial |
| 👹 **Orcs** | Always defect | Exploitative, self-interested |

### Interaction Outcomes

| Player 1 | Player 2 | Result |
|----------|----------|--------|
| Cooperate | Cooperate | Both succeed (mutual benefit) |
| Cooperate | Defect | Defector wins, cooperator loses |
| Defect | Defect | Standoff (orcs scrape by, others get nothing) |

### Survival Pressure

Every agent must complete at least one successful transaction within 5 turns or they starve. This creates pressure for:
- Hobbits to find reliable partners
- Orcs to either exploit successfully OR learn to cooperate

### The Injury System

Rather than immediate death, violence follows a **graduated punishment** model:

1. **First offense** → Injury (heals in 3 turns)
2. **Second offense while injured** → Death

This models real-world rehabilitation: punishment that allows recovery and behavioral change, rather than purely retributive justice.

**Injured orcs gain +60% cooperation chance** — they've learned the hard way that defection has consequences.

## Control Parameters

### Street Smarts (0-70%)
Base probability that hobbits refuse to interact with orcs. Models **avoidance strategies** and out-group caution.

### Violence (0-100%)
Probability that a hobbit retaliates when betrayed. Models the **credibility of punishment threats**.

### Hobbit School
Information sharing among hobbits:
- Community betrayal awareness (+5% refuse per incident, max +40%)
- Personal experience weighting (+10% per betrayal, max +30%)
- Blacklist system (+40% refuse known defectors)
- Reputation recognition (−20% refuse for reformed orcs)
- Mercy for injured (−15% refuse for injured orcs)

### Orc School
Fear-based and observational learning:
- Witness trauma (+10% cooperate per fear level)
- Community awareness (+4% per orc death, +2% per injury)
- Habit formation (+20% per past cooperation)
- Injury learning (+60% cooperate while injured)
- Mutual protection (+50% cooperate if both orcs scared)

## Welfare Calculation

```
Welfare = Survival% − (Orc Mortality% × 0.5)
```

This captures the insight that **peaceful prosperity beats violent stability**. A society where everyone survives through cooperation scores higher than one where cooperators survive by killing all defectors.

## Theoretical Background

### The Prisoner's Dilemma and Cooperation

The simulation is grounded in iterated Prisoner's Dilemma research, which examines how cooperation can emerge and stabilize among self-interested agents.

**Axelrod's Tournaments (1984)** demonstrated that in repeated interactions, cooperative strategies like Tit-for-Tat outperform pure defection. The winning strategies shared key properties:
- **Nice**: Never defect first
- **Provocable**: Punish defection
- **Forgiving**: Return to cooperation after punishment
- **Clear**: Be predictable so others can adapt

Our Hobbits are "nice" (always cooperate first), and the violence parameter makes them "provocable." The injury system makes them "forgiving" — punishment isn't permanent.

> Axelrod, R. (1984). *The Evolution of Cooperation*. Basic Books.

### Altruistic Punishment

Fehr and Gächter's public goods experiments showed that **cooperation collapses without punishment**, even when punishment is costly to the punisher. A minority of "altruistic punishers" can stabilize cooperation for an entire group.

The violence parameter models this: hobbits pay a cost (risk, moral weight) to punish defectors, but this punishment sustains cooperation for everyone.

> Fehr, E., & Gächter, S. (2002). Altruistic punishment in humans. *Nature*, 415(6868), 137-140.

### Graduated Sanctions and Institutional Design

Ostrom's research on common-pool resource management found that successful communities use **graduated sanctions** — first offenses receive mild punishment, with escalation for repeat offenders. This is more effective than either zero punishment or harsh immediate punishment.

Our injury system directly implements this: first offense = injury (warning), second offense while injured = death (escalation).

> Ostrom, E. (1990). *Governing the Commons: The Evolution of Institutions for Collective Action*. Cambridge University Press.

### The Optimal Level of Violence

The simulation demonstrates a counterintuitive finding from game theory: **the optimal level of violence is not zero**. Some level of credible punishment threat is necessary to make cooperation the rational choice for would-be defectors.

This connects to Hobbes's insight about the state of nature, and to modern work on deterrence theory:

> Boyd, R., & Richerson, P. J. (1992). Punishment allows the evolution of cooperation (or anything else) in sizable groups. *Ethology and Sociobiology*, 13(3), 171-195.

### Reputation Systems and Information Sharing

The Hobbit School mechanism models how **reputation systems** and **information sharing** can reduce exploitation. When defectors are identified and blacklisted, the returns to defection decrease.

This connects to research on:
- Online reputation systems (eBay, Airbnb)
- Credit scoring and financial trust
- Community gossip as social enforcement

> Nowak, M. A., & Sigmund, K. (2005). Evolution of indirect reciprocity. *Nature*, 437(7063), 1291-1298.

### Fear-Based Learning and Deterrence

The Orc School mechanism models how **witnessing consequences** changes behavior. This draws on:
- Deterrence theory in criminology
- Social learning theory (Bandura)
- Evolutionary models of fear and avoidance

The key insight: punishment doesn't just affect the punished individual — observers update their behavior based on witnessed outcomes.

> Bandura, A. (1977). *Social Learning Theory*. Prentice Hall.

### Rehabilitation vs. Retribution

The injury system embodies the rehabilitation model: punishment that allows behavioral change, rather than purely retributive or incapacitating approaches.

Research suggests that rehabilitation-focused systems can reduce recidivism while maintaining deterrence:

> Cullen, F. T., & Gendreau, P. (2000). Assessing correctional rehabilitation: Policy, practice, and prospects. *Criminal Justice*, 3, 109-175.

## Scenarios to Explore

### 1. Baseline Exploitation
- Schools: OFF
- Street Smarts: 0%
- Violence: 0%

Watch hobbits get exploited until they starve, then orcs starve (no one left to exploit).

### 2. Pure Avoidance
- Schools: OFF
- Street Smarts: 70%
- Violence: 0%

Can hobbits survive through avoidance alone? (Usually not sustainable — some orcs still find marks)

### 3. Harsh Punishment
- Schools: OFF
- Street Smarts: 10%
- Violence: 90%

Quick orc extinction. High survival for hobbits, but low welfare (violence penalty).

### 4. Rehabilitation Model
- Schools: ON
- Street Smarts: 10-20%
- Violence: 20-40%

The sweet spot. Watch injured orcs reform, build reputation, and achieve stable cooperation.

### 5. Information Asymmetry
- Hobbit School: ON
- Orc School: OFF
- Violence: 30%

Hobbits share information but orcs don't learn from consequences. How does this affect outcomes?

### 6. Learning Without Punishment
- Schools: ON
- Street Smarts: 30%
- Violence: 5%

Can information sharing alone create cooperation without credible punishment? (Usually not)

## Key Insights

1. **Cooperation requires enforcement**: Pure goodwill is exploitable. Some mechanism must make defection costly.

2. **Graduated punishment beats harsh punishment**: Warning shots (injury) create opportunities for reform that immediate death doesn't.

3. **Information sharing amplifies punishment**: When defectors are identified and remembered, the returns to defection decrease across all interactions.

4. **Learning transforms agents**: Defectors who experience consequences can become cooperators, but only if they survive to apply what they learned.

5. **Welfare ≠ Survival**: A society that survives through violence is worse than one that achieves cooperation peacefully.

## Technical Implementation

Built with React. Key state:
- Individual agent properties (fear, injury, reputation, cooperation history)
- Community knowledge (blacklist, betrayal counts, death counts)
- Per-turn event log

All probabilities and modifiers are shown explicitly in the UI so users can understand exactly why agents make their decisions.

## Further Reading

### Books
- Axelrod, R. (1984). *The Evolution of Cooperation*
- Ostrom, E. (1990). *Governing the Commons*
- Nowak, M. A. (2006). *Evolutionary Dynamics: Exploring the Equations of Life*
- Bowles, S., & Gintis, H. (2011). *A Cooperative Species: Human Reciprocity and Its Evolution*

### Papers
- Axelrod, R., & Hamilton, W. D. (1981). The evolution of cooperation. *Science*, 211(4489), 1390-1396.
- Fehr, E., & Gächter, S. (2000). Cooperation and punishment in public goods experiments. *American Economic Review*, 90(4), 980-994.
- Boyd, R., Gintis, H., Bowles, S., & Richerson, P. J. (2003). The evolution of altruistic punishment. *Proceedings of the National Academy of Sciences*, 100(6), 3531-3535.
- Henrich, J., et al. (2006). Costly punishment across human societies. *Science*, 312(5781), 1767-1770.
- Rand, D. G., Dreber, A., Ellingsen, T., Fudenberg, D., & Nowak, M. A. (2009). Positive interactions promote public cooperation. *Science*, 325(5945), 1272-1275.

### Interactive
- Case, N. (2017). *The Evolution of Trust*. https://ncase.me/trust/ — An excellent interactive exploration of similar concepts.

## License

MIT

## Acknowledgments

Inspired by conversations about the optimal level of violence in society, criminal justice reform, and the game theory of institutional design.

---

*"The best time to plant a tree was 20 years ago. The second best time is after you've been injured by a hobbit."* — Reformed Orc Proverb