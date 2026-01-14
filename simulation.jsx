const { useState, useEffect, useCallback, useRef } = React;

const ENTITY_TYPES = {
  HOBBIT: 'hobbit',
  ORC: 'orc'
};

const createEntity = (type, id) => ({
  id,
  type,
  alive: true,
  injured: false,
  injuryTurnsLeft: 0,
  turnsSinceSuccess: 0,
  totalCooperations: 0,
  totalDefections: 0,
  timesBetrayed: 0,
  timesBetrayedOthers: 0,
  fear: 0,
  caution: 0,
  reputation: 0,
});

const GameTheorySimulation = () => {
  const [config, setConfig] = useState({
    hobbitCount: 30,
    orcCount: 30,
    streetSmarts: 0.1,
    violence: 0.3,
    hobbitSchool: true,
    orcSchool: true,
  });
  
  const [entities, setEntities] = useState([]);
  const [turn, setTurn] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [history, setHistory] = useState([]);
  const [lastEvents, setLastEvents] = useState([]);
  const [communityKnowledge, setCommunityKnowledge] = useState({
    hobbitsBetrayedTotal: 0,
    orcDeathsTotal: 0,
    orcInjuriesTotal: 0,
    knownDefectors: new Set(),
  });
  const [stats, setStats] = useState({
    welfare: 100,
    survivalRate: 0,
    violenceRate: 0,
    hobbitDeaths: 0,
    orcDeaths: 0,
    cooperations: 0,
    defections: 0,
    reformedOrcs: 0,
    injuredOrcs: 0,
  });
  
  const intervalRef = useRef(null);

  const initializeSimulation = useCallback(() => {
    const newEntities = [];
    for (let i = 0; i < config.hobbitCount; i++) {
      newEntities.push(createEntity(ENTITY_TYPES.HOBBIT, `H${i}`));
    }
    for (let i = 0; i < config.orcCount; i++) {
      newEntities.push(createEntity(ENTITY_TYPES.ORC, `O${i}`));
    }
    setEntities(newEntities);
    setTurn(0);
    setHistory([]);
    setLastEvents([]);
    setCommunityKnowledge({
      hobbitsBetrayedTotal: 0,
      orcDeathsTotal: 0,
      orcInjuriesTotal: 0,
      knownDefectors: new Set(),
    });
    setStats({
      welfare: 100,
      survivalRate: 100,
      violenceRate: 0,
      hobbitDeaths: 0,
      orcDeaths: 0,
      cooperations: 0,
      defections: 0,
      reformedOrcs: 0,
      injuredOrcs: 0,
    });
  }, [config.hobbitCount, config.orcCount]);

  useEffect(() => {
    initializeSimulation();
  }, []);

  const runTurn = useCallback(() => {
    setEntities(prevEntities => {
      const alive = prevEntities.filter(e => e.alive);
      if (alive.length < 2) {
        setRunning(false);
        return prevEntities;
      }

      const events = [];
      const updated = prevEntities.map(e => ({ ...e }));
      const aliveUpdated = updated.filter(e => e.alive);
      let newKnowledge = { ...communityKnowledge, knownDefectors: new Set(communityKnowledge.knownDefectors) };
      
      let violenceThisTurn = 0;
      let injuriesThisTurn = 0;
      let cooperationsThisTurn = 0;
      let defectionsThisTurn = 0;
      let deathsThisTurn = 0;
      
      // Heal injuries at start of turn
      for (const e of updated) {
        if (e.alive && e.injured) {
          e.injuryTurnsLeft--;
          if (e.injuryTurnsLeft <= 0) {
            e.injured = false;
            events.push({ type: 'healed', msg: `💚 ${e.id} healed from injury` });
          }
        }
      }
      
      const shuffled = [...aliveUpdated].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        const e1 = shuffled[i];
        const e2 = shuffled[i + 1];
        
        let interactionBlocked = false;
        let blocker = null;
        let blocked = null;
        
        // Street smarts check
        const checkStreetSmarts = (hobbit, orc) => {
          let refuseChance = config.streetSmarts;
          
          if (config.hobbitSchool) {
            // +5% per community betrayal (max +40%)
            refuseChance += Math.min(0.4, newKnowledge.hobbitsBetrayedTotal * 0.05);
            // +10% per personal betrayal (max +30%)
            refuseChance += Math.min(0.3, hobbit.caution * 0.1);
            // +40% if orc is on blacklist (reduced from 50%)
            if (newKnowledge.knownDefectors.has(orc.id)) {
              refuseChance += 0.4;
            }
            // -20% if orc has reformed (cooperated before)
            if (orc.reputation > 0) {
              refuseChance -= 0.2;
            }
            // -15% if orc is injured (they've learned their lesson?)
            if (orc.injured) {
              refuseChance -= 0.15;
            }
          }
          
          return Math.random() < Math.min(0.85, refuseChance);
        };
        
        if (e1.type === ENTITY_TYPES.HOBBIT && e2.type === ENTITY_TYPES.ORC) {
          if (checkStreetSmarts(e1, e2)) {
            interactionBlocked = true;
            blocker = e1;
            blocked = e2;
          }
        } else if (e2.type === ENTITY_TYPES.HOBBIT && e1.type === ENTITY_TYPES.ORC) {
          if (checkStreetSmarts(e2, e1)) {
            interactionBlocked = true;
            blocker = e2;
            blocked = e1;
          }
        }
        
        if (interactionBlocked) {
          const reason = newKnowledge.knownDefectors.has(blocked.id) ? '(blacklisted)' : '(wary)';
          events.push({ type: 'refused', msg: `🚫 ${blocker.id} refused ${blocked.id} ${reason}` });
          continue;
        }
        
        // Determine actions
        const getAction = (entity, partner) => {
          if (entity.type === ENTITY_TYPES.HOBBIT) {
            return 'cooperate';
          } else {
            // ORC DECISION
            let cooperateChance = 0;
            
            if (config.orcSchool) {
              // +10% per fear level (witnessing death/injury)
              cooperateChance += entity.fear * 0.10;
              // +4% per community death (max +40%)
              cooperateChance += Math.min(0.4, newKnowledge.orcDeathsTotal * 0.04);
              // +2% per community injury (max +20%)
              cooperateChance += Math.min(0.2, newKnowledge.orcInjuriesTotal * 0.02);
              // +20% per past cooperation (builds habit)
              cooperateChance += entity.totalCooperations * 0.20;
              // +15% base when facing hobbits (they fight back)
              if (partner.type === ENTITY_TYPES.HOBBIT) {
                cooperateChance += 0.15;
              }
              // +60% if INJURED - learned the hard way!
              if (entity.injured) {
                cooperateChance += 0.60;
              }
              // +50% if both orcs are scared (mutual survival)
              if (partner.type === ENTITY_TYPES.ORC && entity.fear > 1 && partner.fear > 1) {
                cooperateChance += 0.50;
              }
            }
            
            return Math.random() < cooperateChance ? 'cooperate' : 'defect';
          }
        };
        
        const action1 = getAction(e1, e2);
        const action2 = getAction(e2, e1);
        
        // Resolve outcomes
        if (action1 === 'cooperate' && action2 === 'cooperate') {
          e1.turnsSinceSuccess = 0;
          e2.turnsSinceSuccess = 0;
          e1.totalCooperations++;
          e2.totalCooperations++;
          e1.reputation++;
          e2.reputation++;
          cooperationsThisTurn++;
          
          const orcInvolved = e1.type === ENTITY_TYPES.ORC || e2.type === ENTITY_TYPES.ORC;
          const injuredOrcCooperated = (e1.type === ENTITY_TYPES.ORC && e1.injured) || (e2.type === ENTITY_TYPES.ORC && e2.injured);
          events.push({ 
            type: 'cooperate', 
            msg: `🤝 ${e1.id} & ${e2.id} cooperated${injuredOrcCooperated ? ' 🌟 (injured orc reformed!)' : orcInvolved ? ' ⭐' : ''}` 
          });
          
        } else if (action1 === 'defect' && action2 === 'defect') {
          e1.totalDefections++;
          e2.totalDefections++;
          e1.reputation--;
          e2.reputation--;
          defectionsThisTurn++;
          newKnowledge.knownDefectors.add(e1.id);
          newKnowledge.knownDefectors.add(e2.id);
          
          // Orc-orc mutual defection: both scrape by (reduced starvation timer)
          if (e1.type === ENTITY_TYPES.ORC && e2.type === ENTITY_TYPES.ORC) {
            e1.turnsSinceSuccess = Math.max(0, e1.turnsSinceSuccess - 2);
            e2.turnsSinceSuccess = Math.max(0, e2.turnsSinceSuccess - 2);
            events.push({ type: 'mutual_defect', msg: `💢 ${e1.id} & ${e2.id} standoff (both scrape by)` });
          } else {
            events.push({ type: 'mutual_defect', msg: `💢 ${e1.id} & ${e2.id} mutual defection` });
          }
          
        } else {
          const defector = action1 === 'defect' ? e1 : e2;
          const victim = action1 === 'defect' ? e2 : e1;
          
          defector.turnsSinceSuccess = 0;
          defector.totalDefections++;
          defector.timesBetrayedOthers++;
          defector.reputation -= 2;
          defectionsThisTurn++;
          
          victim.timesBetrayed++;
          victim.caution++;
          
          newKnowledge.knownDefectors.add(defector.id);
          if (victim.type === ENTITY_TYPES.HOBBIT) {
            newKnowledge.hobbitsBetrayedTotal++;
          }
          
          events.push({ type: 'betrayal', msg: `🗡️ ${defector.id} betrayed ${victim.id}` });
          
          // Violence check - INJURY SYSTEM
          if (victim.type === ENTITY_TYPES.HOBBIT && defector.type === ENTITY_TYPES.ORC) {
            if (Math.random() < config.violence) {
              if (defector.injured) {
                // Already injured → KILL
                defector.alive = false;
                violenceThisTurn++;
                deathsThisTurn++;
                newKnowledge.orcDeathsTotal++;
                events.push({ type: 'violence', msg: `💀 ${victim.id} killed ${defector.id} (was already injured)` });
              } else {
                // Not injured → INJURE
                defector.injured = true;
                defector.injuryTurnsLeft = 3;
                defector.fear += 3; // Significant fear boost from being hurt
                injuriesThisTurn++;
                newKnowledge.orcInjuriesTotal++;
                events.push({ type: 'injury', msg: `🩸 ${victim.id} injured ${defector.id} (heals in 3 turns)` });
              }
            }
          }
        }
      }
      
      // Check starvation
      for (const e of updated) {
        if (e.alive) {
          e.turnsSinceSuccess++;
          if (e.turnsSinceSuccess > 5) {
            e.alive = false;
            deathsThisTurn++;
            if (e.type === ENTITY_TYPES.ORC) {
              newKnowledge.orcDeathsTotal++;
            }
            events.push({ type: 'starved', msg: `💀 ${e.id} starved (no deal in 5 turns)` });
          }
        }
      }
      
      // ORC SCHOOL: Orcs witness deaths and injuries → gain fear
      if (config.orcSchool && (deathsThisTurn > 0 || injuriesThisTurn > 0)) {
        const fearGain = deathsThisTurn * 2 + injuriesThisTurn;
        for (const e of updated) {
          if (e.alive && e.type === ENTITY_TYPES.ORC) {
            e.fear += fearGain;
          }
        }
        if (deathsThisTurn > 0 || injuriesThisTurn > 0) {
          events.push({
            type: 'learning',
            msg: `📚 Orcs witnessed ${deathsThisTurn} death(s), ${injuriesThisTurn} injury(s) → +${fearGain} fear`
          });
        }
      }
      
      setCommunityKnowledge(newKnowledge);
      setLastEvents(events);
      
      // Calculate stats
      const aliveNow = updated.filter(e => e.alive);
      const aliveHobbits = aliveNow.filter(e => e.type === ENTITY_TYPES.HOBBIT).length;
      const aliveOrcs = aliveNow.filter(e => e.type === ENTITY_TYPES.ORC);
      const deadHobbits = config.hobbitCount - aliveHobbits;
      const deadOrcs = config.orcCount - aliveOrcs.length;
      const totalCoops = updated.reduce((sum, e) => sum + e.totalCooperations, 0);
      const totalDefects = updated.reduce((sum, e) => sum + e.totalDefections, 0);
      const reformedOrcs = aliveOrcs.filter(o => o.totalCooperations > 0).length;
      const injuredOrcs = aliveOrcs.filter(o => o.injured).length;
      
      const totalPop = config.hobbitCount + config.orcCount;
      const survivalRate = aliveNow.length / totalPop;
      const violenceRate = config.orcCount > 0 ? deadOrcs / config.orcCount : 0;
      
      // WELFARE = Survival - Violence Penalty
      const welfare = Math.max(0, (survivalRate * 100) - (violenceRate * 50));
      
      const newStats = {
        welfare: Math.round(welfare),
        survivalRate: Math.round(survivalRate * 100),
        violenceRate: Math.round(violenceRate * 100),
        hobbitDeaths: deadHobbits,
        orcDeaths: deadOrcs,
        cooperations: totalCoops,
        defections: totalDefects,
        reformedOrcs,
        injuredOrcs,
      };
      
      setStats(newStats);
      setHistory(prev => [...prev, { turn: turn + 1, ...newStats, aliveHobbits, aliveOrcs: aliveOrcs.length }]);
      
      return updated;
    });
    
    setTurn(t => t + 1);
  }, [config, turn, communityKnowledge]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(runTurn, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, speed, runTurn]);

  const aliveHobbits = entities.filter(e => e.alive && e.type === ENTITY_TYPES.HOBBIT);
  const aliveOrcs = entities.filter(e => e.alive && e.type === ENTITY_TYPES.ORC);
  const deadEntities = entities.filter(e => !e.alive);
  const reformedOrcs = aliveOrcs.filter(o => o.totalCooperations > 0);
  const scaredOrcs = aliveOrcs.filter(o => o.fear > 2);
  const injuredOrcs = aliveOrcs.filter(o => o.injured);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      color: '#c9d1d9',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0, color: '#f0f6fc', fontWeight: 600 }}>
          The Cooperation Dilemma
        </h1>
        <p style={{ color: '#8b949e', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
          Can punishment create cooperation? Now with injury & rehabilitation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', maxWidth: '1500px', margin: '0 auto' }}>
        {/* Controls Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Population */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '14px',
          }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#f0f6fc' }}>Population</h2>
            
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: '#7ee787', fontSize: '0.8rem' }}>🧑‍🌾 Hobbits</label>
                <span style={{ color: '#7ee787', fontSize: '0.8rem' }}>{config.hobbitCount}</span>
              </div>
              <input
                type="range" min="10" max="50" value={config.hobbitCount}
                onChange={e => setConfig({ ...config, hobbitCount: +e.target.value })}
                style={{ width: '100%', accentColor: '#7ee787' }}
                disabled={running}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: '#f85149', fontSize: '0.8rem' }}>👹 Orcs</label>
                <span style={{ color: '#f85149', fontSize: '0.8rem' }}>{config.orcCount}</span>
              </div>
              <input
                type="range" min="10" max="50" value={config.orcCount}
                onChange={e => setConfig({ ...config, orcCount: +e.target.value })}
                style={{ width: '100%', accentColor: '#f85149' }}
                disabled={running}
              />
            </div>
          </div>

          {/* Strategies */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '14px',
          }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#f0f6fc' }}>Hobbit Strategies</h2>
            
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: '#ffa657', fontSize: '0.8rem' }}>🧠 Street Smarts</label>
                <span style={{ color: '#ffa657', fontSize: '0.8rem' }}>{Math.round(config.streetSmarts * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="70" value={config.streetSmarts * 100}
                onChange={e => setConfig({ ...config, streetSmarts: +e.target.value / 100 })}
                style={{ width: '100%', accentColor: '#ffa657' }}
              />
              <p style={{ fontSize: '0.65rem', color: '#8b949e', margin: '2px 0 0 0' }}>
                Base % to refuse dealing with orcs
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: '#ff7b72', fontSize: '0.8rem' }}>⚔️ Violence</label>
                <span style={{ color: '#ff7b72', fontSize: '0.8rem' }}>{Math.round(config.violence * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={config.violence * 100}
                onChange={e => setConfig({ ...config, violence: +e.target.value / 100 })}
                style={{ width: '100%', accentColor: '#ff7b72' }}
              />
              <p style={{ fontSize: '0.65rem', color: '#8b949e', margin: '2px 0 0 0' }}>
                % to retaliate when betrayed (injure → kill)
              </p>
            </div>
          </div>

          {/* Schools */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '14px',
          }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#f0f6fc' }}>Learning Systems</h2>
            
            {/* Hobbit School */}
            <div style={{
              padding: '10px',
              background: config.hobbitSchool ? 'rgba(126, 231, 135, 0.08)' : '#0d1117',
              borderRadius: '6px',
              border: config.hobbitSchool ? '1px solid rgba(126, 231, 135, 0.3)' : '1px solid #21262d',
              marginBottom: '10px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.hobbitSchool}
                  onChange={e => setConfig({ ...config, hobbitSchool: e.target.checked })}
                  style={{ width: '14px', height: '14px', accentColor: '#7ee787' }}
                />
                <span style={{ color: '#7ee787', fontWeight: 600, fontSize: '0.85rem' }}>Hobbit School</span>
              </label>
              <div style={{ fontSize: '0.7rem', color: '#8b949e', marginTop: '6px', paddingLeft: '22px', lineHeight: '1.4' }}>
                <div><strong>Refuse modifiers:</strong></div>
                <div>• +5% per community betrayal (max +40%)</div>
                <div>• +10% per personal betrayal (max +30%)</div>
                <div>• +40% if orc is blacklisted</div>
                <div>• −20% if orc has cooperated before</div>
                <div>• −15% if orc is injured (paid dues)</div>
              </div>
            </div>

            {/* Orc School */}
            <div style={{
              padding: '10px',
              background: config.orcSchool ? 'rgba(248, 81, 73, 0.08)' : '#0d1117',
              borderRadius: '6px',
              border: config.orcSchool ? '1px solid rgba(248, 81, 73, 0.3)' : '1px solid #21262d',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.orcSchool}
                  onChange={e => setConfig({ ...config, orcSchool: e.target.checked })}
                  style={{ width: '14px', height: '14px', accentColor: '#f85149' }}
                />
                <span style={{ color: '#f85149', fontWeight: 600, fontSize: '0.85rem' }}>Orc School</span>
              </label>
              <div style={{ fontSize: '0.7rem', color: '#8b949e', marginTop: '6px', paddingLeft: '22px', lineHeight: '1.4' }}>
                <div><strong>Cooperate modifiers:</strong></div>
                <div>• +10% per fear level</div>
                <div>• +4% per orc death witnessed (max +40%)</div>
                <div>• +2% per orc injury witnessed (max +20%)</div>
                <div>• +20% per past cooperation (habit)</div>
                <div>• +15% when facing hobbits</div>
                <div>• <strong style={{ color: '#ffa657' }}>+60% if currently injured</strong></div>
                <div>• +50% if both orcs scared (fear &gt; 1)</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '14px',
          }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ color: '#79c0ff', fontSize: '0.8rem' }}>Speed</label>
                <span style={{ color: '#79c0ff', fontSize: '0.8rem' }}>{speed}ms</span>
              </div>
              <input
                type="range" min="100" max="1000" step="100" value={speed}
                onChange={e => setSpeed(+e.target.value)}
                style={{ width: '100%', accentColor: '#79c0ff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setRunning(!running)}
                style={{
                  flex: 1, padding: '10px', fontSize: '0.8rem', fontWeight: 600,
                  background: running ? '#f85149' : '#238636',
                  color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                }}
              >
                {running ? '⏸ Pause' : '▶ Run'}
              </button>
              <button
                onClick={runTurn} disabled={running}
                style={{
                  padding: '10px 12px', fontSize: '0.8rem',
                  background: '#1f6feb', color: 'white', border: 'none',
                  borderRadius: '6px', cursor: running ? 'not-allowed' : 'pointer',
                  opacity: running ? 0.5 : 1,
                }}
              >
                Step
              </button>
              <button
                onClick={() => { setRunning(false); initializeSimulation(); }}
                style={{
                  padding: '10px 12px', fontSize: '0.8rem',
                  background: '#30363d', color: '#c9d1d9',
                  border: '1px solid #484f58', borderRadius: '6px', cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Main Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Key Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
          }}>
            <div style={{
              background: '#161b22',
              border: `2px solid ${stats.welfare > 70 ? '#238636' : stats.welfare > 40 ? '#d29922' : '#f85149'}`,
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{ 
                fontSize: '1.75rem', 
                fontWeight: 700, 
                color: stats.welfare > 70 ? '#7ee787' : stats.welfare > 40 ? '#d29922' : '#f85149' 
              }}>
                {stats.welfare}
              </div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem' }}>Welfare</div>
              <div style={{ fontSize: '0.6rem', color: '#484f58' }}>survival − violence</div>
            </div>

            <div style={{
              background: '#161b22',
              border: '1px solid #238636',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#7ee787' }}>
                {stats.survivalRate}%
              </div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem' }}>Survival</div>
              <div style={{ fontSize: '0.6rem', color: '#484f58' }}>
                {aliveHobbits.length + aliveOrcs.length} / {config.hobbitCount + config.orcCount}
              </div>
            </div>

            <div style={{
              background: '#161b22',
              border: '1px solid #f85149',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f85149' }}>
                {stats.violenceRate}%
              </div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem' }}>Orc Deaths</div>
              <div style={{ fontSize: '0.6rem', color: '#484f58' }}>
                {stats.orcDeaths} of {config.orcCount}
              </div>
            </div>

            <div style={{
              background: '#161b22',
              border: '1px solid #ffa657',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffa657' }}>
                {injuredOrcs.length}
              </div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem' }}>Injured</div>
              <div style={{ fontSize: '0.6rem', color: '#484f58' }}>
                healing orcs
              </div>
            </div>

            <div style={{
              background: '#161b22',
              border: '1px solid #a371f7',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a371f7' }}>
                {reformedOrcs.length}
              </div>
              <div style={{ color: '#8b949e', fontSize: '0.75rem' }}>Reformed</div>
              <div style={{ fontSize: '0.6rem', color: '#484f58' }}>
                orcs who cooperated
              </div>
            </div>
          </div>

          {/* Turn Info */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '6px 12px',
            background: '#161b22',
            borderRadius: '6px',
            border: '1px solid #30363d',
            fontSize: '0.75rem',
          }}>
            <span style={{ color: '#8b949e' }}>
              Turn <strong style={{ color: '#f0f6fc' }}>{turn}</strong>
            </span>
            <span style={{ color: '#8b949e' }}>
              🤝 <strong style={{ color: '#7ee787' }}>{stats.cooperations}</strong>
              {' · '}
              🗡️ <strong style={{ color: '#ffa657' }}>{stats.defections}</strong>
              {' · '}
              📋 Blacklist: <strong style={{ color: '#ff7b72' }}>{communityKnowledge.knownDefectors.size}</strong>
              {' · '}
              🩸 Total injuries: <strong style={{ color: '#ffa657' }}>{communityKnowledge.orcInjuriesTotal}</strong>
            </span>
          </div>

          {/* Population Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Hobbits */}
            <div style={{
              background: '#161b22',
              border: '1px solid #238636',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#7ee787', fontWeight: 600, fontSize: '0.85rem' }}>🧑‍🌾 Hobbits</span>
                <span style={{ color: '#7ee787', fontSize: '0.8rem' }}>{aliveHobbits.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', minHeight: '50px' }}>
                {aliveHobbits.map(h => (
                  <div
                    key={h.id}
                    title={`${h.id} | Betrayed: ${h.timesBetrayed}x | Caution: ${h.caution}`}
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: h.caution > 2 ? '#d29922' : h.caution > 0 ? '#3d8b40' : '#238636',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', cursor: 'help',
                    }}
                  >🧑‍🌾</div>
                ))}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#484f58', marginTop: '4px' }}>
                🟢 Trusting · 🟡 Cautious
              </div>
            </div>

            {/* Orcs */}
            <div style={{
              background: '#161b22',
              border: '1px solid #f85149',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#f85149', fontWeight: 600, fontSize: '0.85rem' }}>👹 Orcs</span>
                <span style={{ color: '#f85149', fontSize: '0.8rem' }}>{aliveOrcs.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', minHeight: '50px' }}>
                {aliveOrcs.map(o => {
                  const isReformed = o.totalCooperations > 0;
                  const isInjured = o.injured;
                  const isScared = o.fear > 2;
                  return (
                    <div
                      key={o.id}
                      title={`${o.id} | Fear: ${o.fear} | Coops: ${o.totalCooperations} | ${isInjured ? `INJURED (${o.injuryTurnsLeft} turns)` : 'Healthy'}`}
                      style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: isInjured ? '#ffa657' 
                          : isReformed ? '#238636' 
                          : isScared ? '#8957e5' 
                          : '#da3633',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', cursor: 'help',
                        border: isReformed ? '2px solid #7ee787' : isInjured ? '2px solid #ff7b72' : 'none',
                        boxSizing: 'border-box',
                      }}
                    >👹</div>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#484f58', marginTop: '4px' }}>
                🔴 Aggressive · 🟣 Scared · 🟠 Injured · 🟢 Reformed
              </div>
            </div>
          </div>

          {/* Graveyard */}
          {deadEntities.length > 0 && (
            <div style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '6px',
              padding: '8px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8b949e', fontSize: '0.75rem' }}>⚰️ Fallen</span>
                <span style={{ color: '#484f58', fontSize: '0.7rem' }}>
                  {deadEntities.filter(e => e.type === ENTITY_TYPES.HOBBIT).length} 🧑‍🌾 · {deadEntities.filter(e => e.type === ENTITY_TYPES.ORC).length} 👹
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px', maxHeight: '24px', overflow: 'auto' }}>
                {deadEntities.map(e => (
                  <span key={e.id} style={{ fontSize: '10px', opacity: 0.3, filter: 'grayscale(100%)' }}>
                    {e.type === ENTITY_TYPES.HOBBIT ? '🧑‍🌾' : '👹'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event Log */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '12px',
            maxHeight: '160px',
            overflow: 'auto',
            flex: 1,
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#8b949e', fontSize: '0.75rem' }}>Event Log</h3>
            {lastEvents.length === 0 ? (
              <p style={{ color: '#484f58', fontStyle: 'italic', margin: 0, fontSize: '0.75rem' }}>
                Press Run or Step to start
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {lastEvents.map((event, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '0.7rem',
                      padding: '3px 6px',
                      borderRadius: '3px',
                      background: event.type === 'cooperate' ? 'rgba(35, 134, 54, 0.2)'
                        : event.type === 'betrayal' ? 'rgba(255, 166, 87, 0.2)'
                        : event.type === 'violence' ? 'rgba(248, 81, 73, 0.3)'
                        : event.type === 'injury' ? 'rgba(255, 166, 87, 0.3)'
                        : event.type === 'healed' ? 'rgba(126, 231, 135, 0.2)'
                        : event.type === 'starved' ? 'rgba(139, 148, 158, 0.15)'
                        : event.type === 'refused' ? 'rgba(210, 153, 34, 0.15)'
                        : event.type === 'learning' ? 'rgba(163, 113, 247, 0.2)'
                        : 'rgba(48, 54, 61, 0.5)',
                      color: event.type === 'cooperate' ? '#7ee787'
                        : event.type === 'betrayal' ? '#ffa657'
                        : event.type === 'violence' ? '#f85149'
                        : event.type === 'injury' ? '#ffa657'
                        : event.type === 'healed' ? '#7ee787'
                        : event.type === 'starved' ? '#8b949e'
                        : event.type === 'refused' ? '#d29922'
                        : event.type === 'learning' ? '#a371f7'
                        : '#c9d1d9',
                    }}
                  >
                    {event.msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules Summary */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '0.7rem',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#f0f6fc' }}>📜 Rules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#8b949e' }}>
              <div><strong style={{ color: '#7ee787' }}>Hobbits:</strong> Always cooperate</div>
              <div><strong style={{ color: '#f85149' }}>Orcs:</strong> Always defect (unless learned)</div>
              <div><strong style={{ color: '#ffa657' }}>Survival:</strong> Need 1 deal per 5 turns</div>
              <div><strong style={{ color: '#79c0ff' }}>Mutual coop:</strong> Both succeed</div>
              <div><strong style={{ color: '#ff7b72' }}>Betrayal:</strong> Defector wins, victim loses</div>
              <div><strong style={{ color: '#a371f7' }}>Orc standoff:</strong> Both scrape by</div>
            </div>
            <div style={{ 
              marginTop: '8px', 
              padding: '8px', 
              background: 'rgba(255, 166, 87, 0.1)', 
              borderRadius: '4px',
              border: '1px solid rgba(255, 166, 87, 0.3)',
            }}>
              <strong style={{ color: '#ffa657' }}>⚔️ Injury System:</strong>
              <div style={{ marginTop: '4px' }}>
                1st hit → <strong>Injured</strong> (heals in 3 turns, +60% cooperate chance)
                <br />
                2nd hit while injured → <strong>Death</strong>
              </div>
            </div>
            <div style={{ marginTop: '8px', padding: '6px', background: '#0d1117', borderRadius: '4px' }}>
              <strong style={{ color: '#d2a8ff' }}>Welfare</strong> = Survival% − (Orc Deaths% × 0.5)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTheorySimulation;