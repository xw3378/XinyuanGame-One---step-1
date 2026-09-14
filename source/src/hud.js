// ============================================================
// READABLE HUD
// ============================================================
// The brief wants invisible data translated into feedback the player can
// read. The PRIMARY channels are diegetic (trembling limbs, heavy
// breathing, swaying camera, creaking holds). This HUD is the supporting
// readout that makes the same numbers legible at a glance.
//
// It deliberately shows LOAD ON THE ARMS, because "how much of me is
// hanging off my hands?" is exactly the judgement a beginner is missing.
// It never reveals a hold's friction number - that stays inferred.
// ============================================================

const pct = (v) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

export function createHud(doc = document) {
  const el = (id) => doc.getElementById(id);
  const nodes = {
    levelName: el('level-name'),
    levelSub: el('level-sub'),
    lesson: el('lesson'),
    energyFill: el('energy-fill'),
    energyLabel: el('energy-label'),
    balanceFill: el('balance-fill'),
    armLoadFill: el('arm-load-fill'),
    armLoadLabel: el('arm-load-label'),
    gripLH: el('grip-lh'),
    gripRH: el('grip-rh'),
    gripLF: el('grip-lf'),
    gripRF: el('grip-rf'),
    heightLabel: el('height-label'),
    timeLabel: el('time-label'),
    toast: el('toast'),
    aimInfo: el('aim-info'),
    restFlag: el('rest-flag'),
  };

  let toastTimer = 0;

  function setLevel(preset) {
    if (nodes.levelName) nodes.levelName.textContent = `${preset.index}. ${preset.name}`;
    if (nodes.levelSub) nodes.levelSub.textContent = preset.subtitle;
    if (nodes.lesson) nodes.lesson.textContent = preset.lesson;
  }

  function toast(message, kind = 'info') {
    if (!nodes.toast) return;
    nodes.toast.textContent = message;
    nodes.toast.className = `toast toast--${kind} toast--visible`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      nodes.toast.className = `toast toast--${kind}`;
    }, 1900);
  }

  function update(results, climber, info) {
    const energyFrac = Math.max(0, climber.energy) / 100;
    if (nodes.energyFill) {
      nodes.energyFill.style.width = pct(energyFrac);
      nodes.energyFill.classList.toggle('is-danger', energyFrac < 0.28);
    }
    if (nodes.energyLabel) nodes.energyLabel.textContent = `Energy ${pct(energyFrac)}`;

    // Invisible -> readable: how much weight the arms are carrying.
    if (nodes.armLoadFill) {
      nodes.armLoadFill.style.width = pct(results.handShare);
      nodes.armLoadFill.classList.toggle('is-danger', results.handShare > 0.66);
    }
    if (nodes.armLoadLabel) nodes.armLoadLabel.textContent = `Weight on arms ${pct(results.handShare)}`;

    if (nodes.balanceFill) {
      nodes.balanceFill.style.width = pct(results.stability);
      nodes.balanceFill.classList.toggle('is-danger', results.stability < 0.45);
    }

    const setGrip = (node, limb) => {
      if (!node) return;
      const has = !!results.contacts[limb];
      if (!has) {
        node.style.width = '0%';
        node.classList.remove('is-warn', 'is-danger');
        node.classList.add('is-off');
        return;
      }
      node.classList.remove('is-off');
      node.style.width = pct(1 - Math.min(1, results.risk[limb] ?? 0));
      node.classList.toggle('is-warn', (results.risk[limb] ?? 0) > 0.62);
      node.classList.toggle('is-danger', (results.risk[limb] ?? 0) > 0.82);
    };
    setGrip(nodes.gripLH, 'LH');
    setGrip(nodes.gripRH, 'RH');
    setGrip(nodes.gripLF, 'LF');
    setGrip(nodes.gripRF, 'RF');

    if (nodes.heightLabel) nodes.heightLabel.textContent = `${(info.height ?? 0).toFixed(1)} m of ${info.total.toFixed(1)} m`;
    if (nodes.timeLabel) nodes.timeLabel.textContent = `${Math.max(0, Math.ceil(info.timeLeft))}s`;
    if (nodes.timeLabel) nodes.timeLabel.classList.toggle('is-danger', info.timeLeft < 30);

    if (nodes.restFlag) {
      const resting = info.resting;
      nodes.restFlag.classList.toggle('is-active', resting);
      nodes.restFlag.textContent = resting
        ? results.restingWell
          ? 'Resting — weight on your feet'
          : 'Resting poorly — hips out, arms loaded'
        : '';
    }

    if (nodes.aimInfo) nodes.aimInfo.textContent = info.aimText || '';
  }

  return { setLevel, toast, update, nodes };
}
