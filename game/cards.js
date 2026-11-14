// Original abstract card fronts for the Mirmo series.
// The gallery ships names and a palette (charcoal, parchment, antique gold)
// and does not include image files. These paintings are drawn in the browser
// and shared by the gallery and Spellflight.

export const SPELLS = {
  prism: { name: "Prism Split", cooldown: 8, duration: 5.5 },
  dream: { name: "Dream Veil", cooldown: 10, duration: 5 },
  astral: { name: "Astral Lance", cooldown: 8, duration: 5 },
  mind: { name: "Mind Mark", cooldown: 12, duration: 4.5 },
  gale: { name: "Gale Focus", cooldown: 9, duration: 5 },
  guide: { name: "Guide Star", cooldown: 11, duration: 6.5 },
  listen: { name: "Ground Listen", cooldown: 11, duration: 5.5 },
  fang: { name: "Fang Beam", cooldown: 8, duration: 5 },
  dive: { name: "Eagle Dive", cooldown: 9, duration: 0.85 },
  thunder: { name: "Thunder Hide", cooldown: 9, duration: 5 },
  shadow: { name: "Shadow Spark", cooldown: 10, duration: 4.5 },
  steady: { name: "Steady Hand", cooldown: 8, duration: 7 },
};

export const CARDS = [
  {
    id: "021",
    name: "Shapeshifter",
    rarity: "legendary",
    motif: "masks",
    spell: "prism",
    blurb: "Shell pieces near your beam crack and fall away.",
    nature: 64,
    beauty: 91,
    strength: 72,
    spirit: 97,
    pigments: ["#14081c", "#6d35e0", "#d4af37", "#f4efe4"],
  },
  {
    id: "022",
    name: "Dreamwalker",
    rarity: "legendary",
    motif: "dream",
    spell: "dream",
    blurb: "The dark ball slows, and the source hums louder.",
    nature: 78,
    beauty: 93,
    strength: 60,
    spirit: 98,
    pigments: ["#0c1224", "#3a6cff", "#e7c56a", "#f3ecdf"],
  },
  {
    id: "023",
    name: "Astral Walker",
    rarity: "legendary",
    motif: "astral",
    spell: "astral",
    blurb: "The beam reaches farther and burns hotter.",
    nature: 70,
    beauty: 84,
    strength: 80,
    spirit: 95,
    pigments: ["#120818", "#b13cff", "#7ae1ff", "#f0e6d2"],
  },
  {
    id: "024",
    name: "Telepath",
    rarity: "legendary",
    motif: "mind",
    spell: "mind",
    blurb: "A mark appears on the source inside the ball.",
    nature: 58,
    beauty: 88,
    strength: 66,
    spirit: 99,
    pigments: ["#160d22", "#d457c8", "#f0e6d2", "#d4af37"],
  },
  {
    id: "025",
    name: "Wind Talker",
    rarity: "legendary",
    motif: "wind",
    spell: "gale",
    blurb: "The beam leans toward the source while the wind holds.",
    nature: 86,
    beauty: 80,
    strength: 74,
    spirit: 94,
    pigments: ["#102028", "#7fd7c8", "#e8e2d4", "#d4af37"],
  },
  {
    id: "026",
    name: "Sacagawea",
    rarity: "legendary",
    motif: "guide",
    spell: "guide",
    blurb: "Historical guide. A star shows the way to the source.",
    nature: 90,
    beauty: 86,
    strength: 84,
    spirit: 96,
    pigments: ["#1a1208", "#e2b15a", "#f4efe4", "#8c2f2a"],
  },
  {
    id: "027",
    name: "Lozen",
    rarity: "legendary",
    motif: "listen",
    spell: "listen",
    blurb: "Warrior and listener. The source answers with a bright edge.",
    nature: 88,
    beauty: 78,
    strength: 92,
    spirit: 95,
    pigments: ["#10140e", "#c4552a", "#e6d7b0", "#d4af37"],
  },
  {
    id: "028",
    name: "Wolf Spirit",
    rarity: "legendary",
    motif: "wolf",
    spell: "fang",
    blurb: "A narrow beam. The source burns much faster.",
    nature: 82,
    beauty: 76,
    strength: 93,
    spirit: 92,
    pigments: ["#121418", "#d8d2c6", "#d4af37", "#8aa0b4"],
  },
  {
    id: "029",
    name: "Running Eagle",
    rarity: "legendary",
    motif: "eagle",
    spell: "dive",
    blurb: "Woman warrior. The next touch on the source bites deep.",
    nature: 80,
    beauty: 84,
    strength: 96,
    spirit: 93,
    pigments: ["#1a1008", "#f0c56e", "#8c1f1f", "#f3ecdf"],
  },
  {
    id: "031",
    name: "Buffalo Spirit",
    rarity: "standard",
    motif: "buffalo",
    spell: "thunder",
    blurb: "A wide beam that shoves shell pieces apart.",
    nature: 94,
    beauty: 70,
    strength: 98,
    spirit: 86,
    pigments: ["#1a120c", "#6a3a22", "#c47a3a", "#e6d3b0"],
  },
  {
    id: "032",
    name: "Raven Spirit",
    rarity: "standard",
    motif: "raven",
    spell: "shadow",
    blurb: "A black-gold spark sits on the source.",
    nature: 76,
    beauty: 90,
    strength: 68,
    spirit: 94,
    pigments: ["#0c0c10", "#1c1c24", "#d4af37", "#9aa3c7"],
  },
  {
    id: "034",
    name: "Canoe Carver",
    rarity: "standard",
    motif: "canoe",
    spell: "steady",
    blurb: "Aim holds still, and a lock is slow to slip.",
    nature: 84,
    beauty: 74,
    strength: 80,
    spirit: 77,
    pigments: ["#14100c", "#8a5a32", "#d8c39a", "#6ea8a0"],
  },
];

export function cardById(id) {
  return CARDS.find((card) => card.id === id) || null;
}

const STATS = [
  ["N", "nature"],
  ["B", "beauty"],
  ["S", "strength"],
  ["P", "spirit"],
];

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function brush(ctx, color, width, alpha, draw) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  draw(ctx);
  ctx.stroke();
  ctx.restore();
}

function paintMotif(ctx, motif, ink, gold) {
  ctx.save();
  ctx.translate(256, 300);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (motif === "masks") {
    brush(ctx, ink, 10, 0.9, (c) => {
      c.arc(-48, 0, 70, 0.4, Math.PI * 1.7);
    });
    brush(ctx, gold, 8, 0.85, (c) => {
      c.arc(52, 8, 64, Math.PI * 0.8, Math.PI * 2.3);
    });
    brush(ctx, ink, 4, 0.7, (c) => {
      c.moveTo(-78, -10);
      c.quadraticCurveTo(-20, 30, 10, -6);
    });
  } else if (motif === "dream") {
    brush(ctx, gold, 8, 0.9, (c) => {
      c.arc(0, 10, 78, 0.2, Math.PI * 1.85);
    });
    brush(ctx, ink, 6, 0.85, (c) => {
      c.arc(8, -8, 22, 0, Math.PI * 2);
    });
    brush(ctx, ink, 5, 0.8, (c) => {
      c.arc(18, -16, 8, 0, Math.PI * 2);
    });
  } else if (motif === "astral") {
    for (let i = 0; i < 4; i++) {
      brush(ctx, i % 2 ? gold : ink, 6, 0.8, (c) => {
        c.arc(0, 0, 30 + i * 24, i, i + 2.2);
      });
    }
    brush(ctx, gold, 4, 1, (c) => {
      c.moveTo(0, -18);
      c.lineTo(6, -4);
      c.lineTo(20, 0);
      c.lineTo(6, 4);
      c.lineTo(0, 18);
      c.lineTo(-6, 4);
      c.lineTo(-20, 0);
      c.lineTo(-6, -4);
      c.closePath();
    });
  } else if (motif === "mind") {
    brush(ctx, ink, 8, 0.9, (c) => {
      c.arc(0, 8, 72, Math.PI * 1.05, Math.PI * 1.95);
    });
    brush(ctx, gold, 5, 0.9, (c) => {
      c.arc(0, 4, 16, 0, Math.PI * 2);
    });
    brush(ctx, gold, 3, 0.75, (c) => {
      c.moveTo(0, -70);
      c.lineTo(0, -28);
    });
  } else if (motif === "wind") {
    for (let i = 0; i < 4; i++) {
      brush(ctx, i === 1 ? gold : ink, 7 - i, 0.85, (c) => {
        const y = -50 + i * 32;
        c.moveTo(-110, y);
        c.bezierCurveTo(-20, y - 28, 30, y + 26, 120, y - 8);
      });
    }
  } else if (motif === "guide") {
    brush(ctx, gold, 8, 0.95, (c) => {
      c.moveTo(0, -90);
      c.lineTo(16, -28);
      c.lineTo(78, -18);
      c.lineTo(28, 12);
      c.lineTo(42, 78);
      c.lineTo(0, 40);
      c.lineTo(-42, 78);
      c.lineTo(-28, 12);
      c.lineTo(-78, -18);
      c.lineTo(-16, -28);
      c.closePath();
    });
    brush(ctx, ink, 3, 0.5, (c) => c.arc(0, 4, 100, 0, Math.PI * 2));
  } else if (motif === "listen") {
    brush(ctx, ink, 9, 0.9, (c) => {
      c.moveTo(-70, 70);
      c.quadraticCurveTo(-10, 20, 0, -70);
    });
    brush(ctx, gold, 6, 0.85, (c) => {
      c.arc(28, -20, 36, Math.PI * 0.7, Math.PI * 1.8);
    });
    brush(ctx, gold, 4, 0.7, (c) => {
      c.arc(40, -8, 58, Math.PI * 0.85, Math.PI * 1.55);
    });
  } else if (motif === "wolf") {
    brush(ctx, ink, 10, 0.95, (c) => {
      c.moveTo(-90, 40);
      c.lineTo(-40, 10);
      c.lineTo(-10, -50);
      c.lineTo(18, -10);
      c.lineTo(90, 6);
    });
    brush(ctx, gold, 5, 0.8, (c) => {
      c.moveTo(-10, -50);
      c.lineTo(-28, -78);
      c.moveTo(6, -28);
      c.lineTo(8, -62);
    });
    brush(ctx, gold, 4, 0.9, (c) => c.arc(48, -2, 4, 0, Math.PI * 2));
  } else if (motif === "eagle") {
    brush(ctx, ink, 10, 0.9, (c) => {
      c.moveTo(-120, 10);
      c.quadraticCurveTo(-40, -70, 0, -10);
      c.quadraticCurveTo(40, -70, 120, 10);
    });
    brush(ctx, gold, 6, 0.85, (c) => {
      c.moveTo(0, -10);
      c.lineTo(0, 70);
    });
    brush(ctx, gold, 5, 0.8, (c) => {
      c.moveTo(-18, 24);
      c.lineTo(22, 40);
    });
  } else if (motif === "buffalo") {
    brush(ctx, ink, 12, 0.9, (c) => {
      c.moveTo(-80, 30);
      c.quadraticCurveTo(-40, -40, 20, -10);
      c.quadraticCurveTo(70, 0, 90, 36);
    });
    brush(ctx, gold, 7, 0.85, (c) => {
      c.moveTo(-20, -16);
      c.quadraticCurveTo(-50, -70, -10, -48);
      c.moveTo(10, -20);
      c.quadraticCurveTo(30, -78, 58, -36);
    });
  } else if (motif === "raven") {
    brush(ctx, ink, 10, 0.95, (c) => {
      c.moveTo(-80, 20);
      c.quadraticCurveTo(-10, -60, 70, -8);
      c.lineTo(108, 8);
    });
    brush(ctx, gold, 4, 0.8, (c) => {
      c.moveTo(70, -8);
      c.lineTo(40, 36);
    });
    brush(ctx, gold, 3, 0.7, (c) => c.arc(24, -6, 5, 0, Math.PI * 2));
  } else if (motif === "canoe") {
    brush(ctx, ink, 10, 0.95, (c) => {
      c.moveTo(-120, 10);
      c.quadraticCurveTo(0, 78, 120, 10);
    });
    brush(ctx, gold, 6, 0.85, (c) => {
      c.moveTo(16, -70);
      c.lineTo(-8, 28);
    });
    brush(ctx, gold, 5, 0.75, (c) => {
      c.moveTo(-28, -48);
      c.lineTo(36, -62);
    });
  }
  ctx.restore();
}

export function paintCard(canvas, card) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const [ground, a, b, ink] = card.pigments;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  roundRect(ctx, 8, 8, w - 16, h - 16, 28);
  ctx.clip();
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);

  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, a);
  wash.addColorStop(0.55, ground);
  wash.addColorStop(1, b);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  brush(ctx, a, 46, 0.35, (c) => {
    c.moveTo(-20, 80);
    c.bezierCurveTo(120, 40, 180, 220, 40, 360);
  });
  brush(ctx, b, 34, 0.4, (c) => {
    c.moveTo(w + 10, 120);
    c.bezierCurveTo(300, 180, 220, 420, 460, 520);
  });
  brush(ctx, ink, 18, 0.18, (c) => {
    c.moveTo(40, h);
    c.quadraticCurveTo(200, 480, 420, 560);
  });

  paintMotif(ctx, card.motif, ink, b);

  if (card.rarity === "legendary") {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = b;
    for (let i = 0; i < 14; i++) {
      const x = 48 + ((i * 97) % (w - 96));
      const y = 70 + ((i * 53) % 220);
      ctx.fillRect(x, y, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
    }
    ctx.restore();
  }

  ctx.fillStyle = "rgba(8, 7, 10, 0.78)";
  ctx.fillRect(24, h - 196, w - 48, 168);

  ctx.fillStyle = b;
  ctx.font = "600 22px Outfit, sans-serif";
  ctx.fillText(card.id, 36, 58);
  ctx.font = "600 18px Outfit, sans-serif";
  ctx.fillStyle = ink;
  const tag = card.rarity === "legendary" ? "LEGENDARY" : "STANDARD";
  ctx.fillText(tag, w - ctx.measureText(tag).width - 36, 56);

  ctx.fillStyle = ink;
  ctx.font = "560 40px Fraunces, Georgia, serif";
  ctx.fillText(card.name, 36, h - 142);
  ctx.font = "500 20px Outfit, sans-serif";
  ctx.fillStyle = b;
  ctx.fillText(SPELLS[card.spell].name, 36, h - 110);

  STATS.forEach(([label, key], index) => {
    const x = 36 + index * 112;
    const y = h - 78;
    ctx.fillStyle = ink;
    ctx.font = "600 14px Outfit, sans-serif";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "rgba(243,236,223,0.18)";
    ctx.fillRect(x + 22, y - 10, 70, 8);
    ctx.fillStyle = b;
    ctx.fillRect(x + 22, y - 10, Math.max(4, (card[key] / 100) * 70), 8);
  });

  ctx.restore();

  ctx.strokeStyle = card.rarity === "legendary" ? b : "rgba(212,175,55,0.55)";
  ctx.lineWidth = card.rarity === "legendary" ? 8 : 4;
  roundRect(ctx, 14, 14, w - 28, h - 28, 24);
  ctx.stroke();
  if (card.rarity === "legendary") {
    ctx.strokeStyle = "rgba(240, 194, 122, 0.35)";
    ctx.lineWidth = 16;
    roundRect(ctx, 6, 6, w - 12, h - 12, 30);
    ctx.stroke();
  }
}
