import type { IslandQuest } from "../island-quest-rules.js";

/**
 * Starfall Isle's Quest, for Year 6: a mysterious signal is beeping
 * from the stars, a space probe has crash-landed and the observatory's
 * star map is lost. Its questions come from the Year 6 National
 * Curriculum.
 */
export const starfallIsleQuest: IslandQuest = {
  islandId: "starfall-isle",
  title: "The Starfall Signal",
  story:
    "Beep... beep-beep... A mysterious signal is coming from the stars! But the space probe Kestrel has crash-landed in the meteorite crater, the island's gadgets have gone haywire and the observatory's great star map has vanished. Pick up what you find, help the scientists of Starfall Isle, and get everything working in time to send a reply to the stars.",
  trophyName: "Starfall Signal Hero",
  lyingFindIds: [
    "starfall-isle.coil-of-rope",
    "starfall-isle.oil-can",
    "starfall-isle.stopwatch",
    "starfall-isle.rover-key",
    "starfall-isle.small-mirror",
    "starfall-isle.bag-of-seeds",
    "starfall-isle.brass-gear",
    "starfall-isle.long-net",
    "starfall-isle.computer-chip",
    "starfall-isle.silver-star-key",
  ],
  finds: [
    {
      id: "starfall-isle.coil-of-rope",
      name: "Coil of Rope",
      about: "A long, strong rope. Perfect for climbing down into deep places.",
      look: { shape: "rope", colour: "#c8a165", trim: "#7a5230" },
    },
    {
      id: "starfall-isle.police-badge",
      name: "Police Badge",
      about:
        "A shiny silver badge with a star on it. It's a bit dusty from the crater.",
      look: { shape: "badge", colour: "#cbd5e1", trim: "#1e3a8a" },
    },
    {
      id: "starfall-isle.evidence-magnifier",
      name: "Evidence Magnifier",
      about: "A police magnifying glass for spotting the tiniest clues.",
      look: { shape: "magnifier", colour: "#bfdbfe", trim: "#1e293b" },
    },
    {
      id: "starfall-isle.oil-can",
      name: "Oil Can",
      about: "A little can of oil with a long spout. Squeaky things hate it.",
      look: { shape: "bottle", colour: "#16a34a", trim: "#facc15" },
    },
    {
      id: "starfall-isle.charged-battery",
      name: "Charged Battery",
      about: "A chunky battery, full to the brim with wind power.",
      look: { shape: "battery", colour: "#1f2937", trim: "#f97316" },
    },
    {
      id: "starfall-isle.safety-cable",
      name: "Safety Cable",
      about:
        "A thick copper cable wrapped in yellow plastic, for carrying electricity safely.",
      look: { shape: "rope", colour: "#facc15", trim: "#b45309" },
    },
    {
      id: "starfall-isle.stopwatch",
      name: "Stopwatch",
      about:
        "A silver stopwatch that can time things to a hundredth of a second.",
      look: { shape: "clock", colour: "#e5e7eb", trim: "#dc2626" },
    },
    {
      id: "starfall-isle.heart-rate-printout",
      name: "Heart-Rate Printout",
      about:
        "A strip of paper with wiggly lines and three heart-rate readings.",
      look: { shape: "scroll", colour: "#fef9c3", trim: "#ef4444" },
    },
    {
      id: "starfall-isle.fit-to-fly-pass",
      name: "Fit-to-Fly Pass",
      about: "A pass signed by the doctor. It says: FIT FOR SPACE.",
      look: { shape: "ticket", colour: "#a7f3d0", trim: "#047857" },
    },
    {
      id: "starfall-isle.rover-key",
      name: "Rover Key",
      about: "A chunky key with a little moon on its fob.",
      look: { shape: "key", colour: "#94a3b8", trim: "#3b82f6" },
    },
    {
      id: "starfall-isle.moon-rock",
      name: "Moon Rock",
      about:
        "A grey, glittery rock. Is it from the Moon, or from the meteorite?",
      look: { shape: "crystal", colour: "#9ca3af", trim: "#e0e7ff" },
    },
    {
      id: "starfall-isle.landing-lights",
      name: "Landing Lights",
      about:
        "A bright lantern that flashes green, the space signal for SAFE TO LAND.",
      look: { shape: "lantern", colour: "#22c55e", trim: "#1e293b" },
    },
    {
      id: "starfall-isle.small-mirror",
      name: "Small Mirror",
      about: "A small, square mirror. You can see a very clever face in it.",
      look: { shape: "mirror", colour: "#dbeafe", trim: "#64748b" },
    },
    {
      id: "starfall-isle.telescope-lens",
      name: "Telescope Lens",
      about:
        "A big, round, perfectly clear lens from a very important telescope.",
      look: { shape: "gem", colour: "#bae6fd", trim: "#0369a1" },
    },
    {
      id: "starfall-isle.observatory-key",
      name: "Observatory Key",
      about: "A golden key with a comet engraved along its handle.",
      look: { shape: "key", colour: "#facc15", trim: "#7c3aed" },
    },
    {
      id: "starfall-isle.bag-of-seeds",
      name: "Bag of Seeds",
      about:
        "A paper bag of sunflower seeds, labelled GROWS FAST IN LOW GRAVITY.",
      look: { shape: "seed-bag", colour: "#d6b98c", trim: "#ca8a04" },
    },
    {
      id: "starfall-isle.giant-sunflower",
      name: "Giant Sunflower",
      about: "A sunflower as big as a dinner plate, packed with hard seeds.",
      look: { shape: "flower", colour: "#facc15", trim: "#78350f" },
    },
    {
      id: "starfall-isle.bird-feeder",
      name: "Full Bird Feeder",
      about:
        "A basket of cracked sunflower seeds, just right for hungry finches.",
      look: { shape: "basket", colour: "#a16207", trim: "#facc15" },
    },
    {
      id: "starfall-isle.brass-gear",
      name: "Brass Gear",
      about:
        "A toothy brass gear wheel. It looks like it belongs in a big machine.",
      look: { shape: "gear", colour: "#d4a017", trim: "#7c5a10" },
    },
    {
      id: "starfall-isle.coded-message",
      name: "Coded Message",
      about:
        "A message from the stars, printed in a jumble of strange letters.",
      look: { shape: "letter", colour: "#f8fafc", trim: "#7c3aed" },
    },
    {
      id: "starfall-isle.safe-combination",
      name: "Safe Combination",
      about: "A scrap of paper with a secret number on it. Don't tell anyone!",
      look: { shape: "scroll", colour: "#fde68a", trim: "#1f2937" },
    },
    {
      id: "starfall-isle.long-net",
      name: "Long Net",
      about: "A net on a very long pole, for catching things that float off.",
      look: { shape: "net", colour: "#84cc16", trim: "#7a5230" },
    },
    {
      id: "starfall-isle.weather-balloon",
      name: "Weather Balloon",
      about:
        "A big white balloon with a tiny weather sensor dangling underneath.",
      look: { shape: "ball", colour: "#f8fafc", trim: "#0ea5e9" },
    },
    {
      id: "starfall-isle.weather-compass",
      name: "Weather Compass",
      about:
        "A compass for the weather station's wind arrow. Its needle wobbles eagerly.",
      look: { shape: "compass", colour: "#0ea5e9", trim: "#e5e7eb" },
    },
    {
      id: "starfall-isle.computer-chip",
      name: "Computer Chip",
      about: "A tiny green chip covered in silver lines. It's a robot's brain!",
      look: { shape: "chip", colour: "#15803d", trim: "#cbd5e1" },
    },
    {
      id: "starfall-isle.robot-spanner",
      name: "Shiny Spanner",
      about: "A spanner polished so brightly you could check your hair in it.",
      look: { shape: "spanner", colour: "#cbd5e1", trim: "#f97316" },
    },
    {
      id: "starfall-isle.glass-prism",
      name: "Glass Prism",
      about: "A triangular block of glass that sparkles in the light.",
      look: { shape: "crystal", colour: "#e0f2fe", trim: "#f472b6" },
    },
    {
      id: "starfall-isle.silver-star-key",
      name: "Silver Star Key",
      about:
        "A silver key with a star-shaped head. It twinkles even in the dark.",
      look: { shape: "key", colour: "#e5e7eb", trim: "#6366f1" },
    },
    {
      id: "starfall-isle.lost-star-map",
      name: "Lost Star Map",
      about:
        "The observatory's great star map, showing every star and constellation in the sky.",
      look: { shape: "map", colour: "#1e1b4b", trim: "#facc15" },
    },
    {
      id: "starfall-isle.morse-code-book",
      name: "Morse Code Book",
      about:
        "A little book of dots and dashes for every letter of the alphabet.",
      look: { shape: "book", colour: "#b91c1c", trim: "#fef3c7" },
    },
  ],
  islanders: [
    {
      id: "starfall-isle.officer-achebe",
      name: "Officer Achebe",
      role: "Police Officer",
      look: {
        skin: "#5a3825",
        hair: "#111111",
        hairStyle: "bun",
        hasBeard: false,
        outfit: "uniform",
        top: "#1e3a8a",
        legs: "#111827",
        hat: "police-helmet",
        hatColour: "#111827",
        held: "whistle",
      },
      greeting:
        "Evening! I'm Officer Achebe. A space probe crashing on my island? That's a case for the police.",
      thanks:
        "Case closed, and my badge is back where it belongs. You've got the sharpest eyes in the galaxy!",
    },
    {
      id: "starfall-isle.firefighter-brennan",
      name: "Firefighter Brennan",
      role: "Firefighter",
      look: {
        skin: "#f5d0b5",
        hair: "#b4471f",
        hairStyle: "curly",
        hasBeard: true,
        outfit: "coat",
        top: "#1f2937",
        legs: "#111827",
        hat: "fire-helmet",
        hatColour: "#dc2626",
        held: "hose",
      },
      greeting:
        "Hello! I'm Firefighter Brennan. On Starfall Isle, the lightning is wild, so I keep everyone safe from sparks.",
      thanks:
        "The lightning tower is safely wired up. Shockingly good work, if you don't mind me saying!",
    },
    {
      id: "starfall-isle.dr-okoro",
      name: "Dr Okoro",
      role: "Doctor",
      look: {
        skin: "#b07850",
        hair: "#1c1917",
        hairStyle: "short",
        hasBeard: true,
        outfit: "coat",
        top: "#f8fafc",
        legs: "#334155",
        hat: "none",
        hatColour: "#000000",
        held: "stethoscope",
      },
      greeting:
        "Hello there! I'm Dr Okoro. I check that everyone on the island is healthy enough to blast off into space.",
      thanks:
        "Every astronaut is fit and well. Remember: a healthy heart loves exercise, water and a good night's sleep!",
    },
    {
      id: "starfall-isle.commander-sol",
      name: "Commander Sol",
      role: "Astronaut",
      look: {
        skin: "#3b2417",
        hair: "#111111",
        hairStyle: "bald",
        hasBeard: false,
        outfit: "spacesuit",
        top: "#f8fafc",
        legs: "#e5e7eb",
        hat: "space-helmet",
        hatColour: "#f97316",
        held: "none",
      },
      greeting:
        "Greetings, Earthling! I'm Commander Sol. I've been to the space station four times, and I still can't eat soup up there.",
      thanks:
        "The landing pad is glowing and the visitors can land safely. You'd make an out-of-this-world astronaut!",
    },
    {
      id: "starfall-isle.professor-vega",
      name: "Professor Vega",
      role: "Astronomer",
      look: {
        skin: "#d6a77a",
        hair: "#d1d5db",
        hairStyle: "long",
        hasBeard: false,
        outfit: "robe",
        top: "#312e81",
        legs: "#1e1b4b",
        hat: "wizard-hat",
        hatColour: "#4338ca",
        held: "telescope",
      },
      greeting:
        "Ah, a visitor! I'm Professor Vega. I study the stars, and I'm named after one, which is very handy.",
      thanks:
        "My great telescope can see the stars again. You are a true star-gazer, my friend!",
    },
    {
      id: "starfall-isle.ren-nakamura",
      name: "Ren Nakamura",
      role: "Robotics Engineer",
      look: {
        skin: "#f0d2b0",
        hair: "#111111",
        hairStyle: "ponytail",
        hasBeard: false,
        outfit: "overalls",
        top: "#f97316",
        legs: "#c2410c",
        hat: "hard-hat",
        hatColour: "#facc15",
        held: "spanner",
      },
      greeting:
        "Hi! I'm Ren Nakamura. I build robots in my workshop. Well, I build them, and then they wander off.",
      thanks:
        "Bolt is working, my spanner is back and the prism is shining. Beep-boop, that means thank you in Robot!",
    },
    {
      id: "starfall-isle.ivy-blackwood",
      name: "Ivy Blackwood",
      role: "Codebreaker",
      look: {
        skin: "#f3d9c6",
        hair: "#f1f5f9",
        hairStyle: "short",
        hasBeard: false,
        outfit: "coat",
        top: "#4b5563",
        legs: "#1f2937",
        hat: "beret",
        hatColour: "#7c3aed",
        held: "book",
      },
      greeting:
        "Psst! I'm Ivy Blackwood, the island's codebreaker. Every message has a secret, and I love finding it.",
      thanks:
        "Message decoded and safe unlocked. You have the mind of a true codebreaker. Tell no one!",
    },
    {
      id: "starfall-isle.ines-moreno",
      name: "Ines Moreno",
      role: "Naturalist",
      look: {
        skin: "#c68e5e",
        hair: "#4a2c1a",
        hairStyle: "curly",
        hasBeard: false,
        outfit: "tunic",
        top: "#65a30d",
        legs: "#78716c",
        hat: "explorer-hat",
        hatColour: "#d6b98c",
        held: "net",
      },
      greeting:
        "¡Hola! I'm Ines Moreno, the naturalist. I look after the finches in the aviary, just like the ones Charles Darwin studied.",
      thanks:
        "The finches are fed and chirping happily. Darwin himself would be proud of you!",
    },
    {
      id: "starfall-isle.sky-adeyemi",
      name: "Sky Adeyemi",
      role: "Meteorologist",
      look: {
        skin: "#6b4226",
        hair: "#1c1917",
        hairStyle: "short",
        hasBeard: false,
        outfit: "coat",
        top: "#0ea5e9",
        legs: "#1e3a8a",
        hat: "beanie",
        hatColour: "#facc15",
        held: "clipboard",
      },
      greeting:
        "Hiya! I'm Sky Adeyemi, the meteorologist. I forecast the weather, and today's forecast is: cloudy with a chance of comets.",
      thanks:
        "My weather station is up and running again. The forecast for you? Bright and sunny all the way!",
    },
    {
      id: "starfall-isle.sparks-mirza",
      name: "Sparks Mirza",
      role: "Radio Operator",
      look: {
        skin: "#a8724c",
        hair: "#111111",
        hairStyle: "long",
        hasBeard: false,
        outfit: "uniform",
        top: "#475569",
        legs: "#1e293b",
        hat: "headscarf",
        hatColour: "#0f766e",
        held: "lantern",
      },
      greeting:
        "Hello, hello! I'm Sparks Mirza, the radio operator. I listen to the stars, and right now they're saying something!",
      thanks:
        "Our reply is flashing out to the stars. Whoever sent that signal knows we're friendly. Over and out, superstar!",
    },
  ],
  things: [
    {
      id: "starfall-isle.meteorite-crater",
      name: "Meteorite Crater",
      shape: "boulder",
      colour: "#57534e",
      trim: "#f97316",
    },
    {
      id: "starfall-isle.crashed-probe",
      name: "Crashed Space Probe",
      shape: "machine",
      colour: "#94a3b8",
      trim: "#ef4444",
    },
    {
      id: "starfall-isle.wind-turbine",
      name: "Squeaky Wind Turbine",
      shape: "machine",
      colour: "#f8fafc",
      trim: "#64748b",
    },
    {
      id: "starfall-isle.lightning-tower",
      name: "Lightning Tower",
      shape: "beacon",
      colour: "#334155",
      trim: "#facc15",
    },
    {
      id: "starfall-isle.space-treadmill",
      name: "Astronaut Treadmill",
      shape: "machine",
      colour: "#1f2937",
      trim: "#22c55e",
    },
    {
      id: "starfall-isle.station-airlock",
      name: "Space Station Airlock",
      shape: "door",
      colour: "#cbd5e1",
      trim: "#0ea5e9",
    },
    {
      id: "starfall-isle.lunar-rover",
      name: "Lunar Rover",
      shape: "cart",
      colour: "#e5e7eb",
      trim: "#f59e0b",
    },
    {
      id: "starfall-isle.ufo-landing-pad",
      name: "UFO Landing Pad",
      shape: "pedestal",
      colour: "#4b5563",
      trim: "#22c55e",
    },
    {
      id: "starfall-isle.periscope",
      name: "Brass Periscope",
      shape: "totem",
      colour: "#b45309",
      trim: "#bae6fd",
    },
    {
      id: "starfall-isle.observatory-door",
      name: "Observatory Door",
      shape: "door",
      colour: "#312e81",
      trim: "#facc15",
    },
    {
      id: "starfall-isle.constellation-garden",
      name: "Constellation Garden",
      shape: "garden-bed",
      colour: "#3f2a1d",
      trim: "#c4b5fd",
    },
    {
      id: "starfall-isle.finch-aviary",
      name: "Finch Aviary",
      shape: "cage",
      colour: "#a16207",
      trim: "#84cc16",
    },
    {
      id: "starfall-isle.satellite-dish",
      name: "Satellite Dish",
      shape: "machine",
      colour: "#e2e8f0",
      trim: "#7c3aed",
    },
    {
      id: "starfall-isle.codebreakers-safe",
      name: "Codebreaker's Safe",
      shape: "safe",
      colour: "#374151",
      trim: "#d4a017",
    },
    {
      id: "starfall-isle.moon-bounce",
      name: "Moon Bounce",
      shape: "fountain",
      colour: "#c4b5fd",
      trim: "#f472b6",
    },
    {
      id: "starfall-isle.weather-station",
      name: "Weather Station",
      shape: "clock-tower",
      colour: "#f8fafc",
      trim: "#0ea5e9",
    },
    {
      id: "starfall-isle.workshop-robot",
      name: "Bolt the Robot",
      shape: "robot",
      colour: "#94a3b8",
      trim: "#f97316",
    },
    {
      id: "starfall-isle.prism-stand",
      name: "Rainbow Prism Stand",
      shape: "pedestal",
      colour: "#e0e7ff",
      trim: "#f472b6",
    },
    {
      id: "starfall-isle.star-chart-chest",
      name: "Star Chart Chest",
      shape: "chest",
      colour: "#1e1b4b",
      trim: "#e5e7eb",
    },
    {
      id: "starfall-isle.morse-lamp",
      name: "Morse Code Lamp",
      shape: "lamp-post",
      colour: "#1f2937",
      trim: "#fde047",
    },
  ],
  puzzles: [
    {
      id: "starfall-isle.climb-into-the-crater",
      title: "Climb into the meteorite crater",
      at: { kind: "thing", id: "starfall-isle.meteorite-crater" },
      needs: "starfall-isle.coil-of-rope",
      gives: "starfall-isle.police-badge",
      ask: "A deep, smoking crater where a meteorite landed long ago. Something silver is twinkling at the very bottom.",
      hintBy: "starfall-isle.commander-sol",
      hint: "The crater's walls are far too steep to climb. Even in low gravity, you'd want a good long rope.",
      solved:
        "You tie the rope to a rock and float gently down. At the bottom, half-buried in space dust, is a silver police badge!",
    },
    {
      id: "starfall-isle.badge-for-officer-achebe",
      title: "Help Officer Achebe",
      at: { kind: "islander", id: "starfall-isle.officer-achebe" },
      needs: "starfall-isle.police-badge",
      gives: "starfall-isle.evidence-magnifier",
      ask: "I leaned over to get a closer look at the meteorite, and my badge bounced clean out of my pocket! I can't investigate the crash without it.",
      hintBy: "starfall-isle.officer-achebe",
      hint: "In this low gravity, my badge bounced a long way down. You'd need a rope to climb into the crater after it.",
      solved:
        '"My badge! Officer Achebe, back on duty. Take my evidence magnifier and see what you can find on that crashed probe."',
    },
    {
      id: "starfall-isle.inspect-the-probe",
      title: "Investigate the crashed probe",
      at: { kind: "thing", id: "starfall-isle.crashed-probe" },
      needs: "starfall-isle.evidence-magnifier",
      ask: "The space probe Kestrel lies on its side, still fizzing. Its crash log is printed in tiny, tiny writing.",
      hintBy: "starfall-isle.ivy-blackwood",
      hint: "Clues hide in the smallest print. Officer Achebe never goes anywhere without a magnifier, once her badge is back.",
      solved:
        "Through the magnifier you read the crash log: KESTREL LANDED AT (−3, 2). The mystery of where it came down is solved!",
      question: {
        prompt:
          "On a coordinate grid, the probe landed at (−3, 2). Where is that point?",
        choices: [
          "3 squares left of the origin and 2 squares up",
          "3 squares right of the origin and 2 squares up",
          "3 squares left of the origin and 2 squares down",
        ],
        answer: 0,
        curriculumLink:
          "Year 6 Maths: describe positions on the full coordinate grid (all four quadrants)",
      },
    },
    {
      id: "starfall-isle.oil-the-turbine",
      title: "Oil the squeaky wind turbine",
      at: { kind: "thing", id: "starfall-isle.wind-turbine" },
      needs: "starfall-isle.oil-can",
      gives: "starfall-isle.charged-battery",
      ask: "A tall white wind turbine. Its blades are stuck, and it squeaks like a mouse every time the wind blows.",
      hintBy: "starfall-isle.ren-nakamura",
      hint: "A squeak means something needs oiling. Find an oil can and those blades will whizz round.",
      solved:
        "A few drops of oil and whoosh, the blades spin! The turbine hums, and out of its side pops a fully charged battery.",
    },
    {
      id: "starfall-isle.battery-for-firefighter-brennan",
      title: "Help Firefighter Brennan",
      at: { kind: "islander", id: "starfall-isle.firefighter-brennan" },
      needs: "starfall-isle.charged-battery",
      gives: "starfall-isle.safety-cable",
      ask: "My heat camera's battery is flat! I can't check the probe for hot spots without it. I need a battery charged by the wind.",
      hintBy: "starfall-isle.firefighter-brennan",
      hint: "Wind turbines turn wind into electricity. Get a stuck one spinning and it'll charge a battery for you.",
      solved:
        '"Fully charged! No hot spots on the probe, phew. Take this safety cable. The lightning tower needs wiring up properly."',
    },
    {
      id: "starfall-isle.wire-the-lightning-tower",
      title: "Wire up the lightning tower",
      at: { kind: "thing", id: "starfall-isle.lightning-tower" },
      needs: "starfall-isle.safety-cable",
      ask: "A crackling metal tower that catches lightning from the storm clouds. A loose wire is fizzing dangerously.",
      hintBy: "starfall-isle.sky-adeyemi",
      hint: "Never touch a loose wire! Firefighter Brennan has a proper safety cable to fix it.",
      solved:
        "You clip the safety cable into place. The lightning flows safely down, and the tower's lamp glows brighter than ever.",
      question: {
        prompt:
          "A circuit has one cell and one bulb. What happens to the bulb if you add a second cell?",
        choices: ["It glows brighter", "It glows dimmer", "It stops working"],
        answer: 0,
        curriculumLink:
          "Year 6 Science: associate the brightness of a lamp or the volume of a buzzer with the number and voltage of cells used in the circuit",
      },
    },
    {
      id: "starfall-isle.time-the-treadmill",
      title: "Time a run on the treadmill",
      at: { kind: "thing", id: "starfall-isle.space-treadmill" },
      needs: "starfall-isle.stopwatch",
      gives: "starfall-isle.heart-rate-printout",
      ask: "A treadmill with straps to stop astronauts floating off. A sign says: TIME YOUR RUN TO PRINT YOUR HEART RATE.",
      hintBy: "starfall-isle.professor-vega",
      hint: "The treadmill won't start until someone times the run. A stopwatch would do it.",
      solved:
        "Click! You time Commander Sol's run, and the treadmill whirrs out a heart-rate printout with three readings.",
    },
    {
      id: "starfall-isle.printout-for-dr-okoro",
      title: "Help Dr Okoro",
      at: { kind: "islander", id: "starfall-isle.dr-okoro" },
      needs: "starfall-isle.heart-rate-printout",
      gives: "starfall-isle.fit-to-fly-pass",
      ask: "Before anyone goes into the space station, I must check their heart rate. But I can't sign anyone off without a printout from a timed run!",
      hintBy: "starfall-isle.dr-okoro",
      hint: "The astronaut treadmill prints heart rates, but only if someone times the run.",
      solved:
        '"A strong, healthy heart! I\'m happy to sign this Fit-to-Fly Pass. Show it at the space station airlock."',
    },
    {
      id: "starfall-isle.open-the-airlock",
      title: "Open the space station airlock",
      at: { kind: "thing", id: "starfall-isle.station-airlock" },
      needs: "starfall-isle.fit-to-fly-pass",
      ask: "A round metal door with a scanner. A sign says: CREW MUST SHOW A FIT-TO-FLY PASS. MEAN HEART RATE BELOW 90.",
      hintBy: "starfall-isle.commander-sol",
      hint: "Nobody gets through that airlock without a pass from Dr Okoro. Doctors' orders!",
      solved:
        "The scanner beeps, works out the mean heart rate and hisses open. Welcome aboard the space station!",
      question: {
        prompt:
          "The three heart-rate readings were 70, 80 and 90 beats per minute. What is the mean?",
        choices: ["80", "240", "90"],
        answer: 0,
        curriculumLink:
          "Year 6 Maths: calculate and interpret the mean as an average",
      },
    },
    {
      id: "starfall-isle.drive-the-rover",
      title: "Drive the lunar rover",
      at: { kind: "thing", id: "starfall-isle.lunar-rover" },
      needs: "starfall-isle.rover-key",
      gives: "starfall-isle.moon-rock",
      ask: "A six-wheeled lunar rover with a scoop on the front. Its engine is switched off.",
      hintBy: "starfall-isle.officer-achebe",
      hint: "That rover won't go anywhere without its key. Someone dropped it while they were moon-walking about.",
      solved:
        "Vroom! The rover trundles off over the bumpy ground and its scoop picks up a glittery moon rock.",
    },
    {
      id: "starfall-isle.rock-for-commander-sol",
      title: "Help Commander Sol",
      at: { kind: "islander", id: "starfall-isle.commander-sol" },
      needs: "starfall-isle.moon-rock",
      gives: "starfall-isle.landing-lights",
      ask: "Mission Control wants a rock sample for my report, but my spacesuit's too bulky to bend down and pick one up!",
      hintBy: "starfall-isle.commander-sol",
      hint: "My lunar rover has a scoop for collecting rocks. If only I could find the key!",
      solved:
        '"A perfect sample! Mission Control will be delighted. Here, take the landing lights. The UFO landing pad is dark."',
    },
    {
      id: "starfall-isle.light-the-landing-pad",
      title: "Light the UFO landing pad",
      at: { kind: "thing", id: "starfall-isle.ufo-landing-pad" },
      needs: "starfall-isle.landing-lights",
      ask: "A triangular landing pad, ready for visitors from the stars. A sign says: LIGHTS MUST COVER THE WHOLE AREA.",
      hintBy: "starfall-isle.sparks-mirza",
      hint: "No pilot can land in the dark! Commander Sol keeps the landing lights.",
      solved:
        "You switch on the lights and the whole triangle glows green. Far above, something twinkles back!",
      question: {
        prompt:
          "The landing pad is a triangle with a base of 8 m and a height of 5 m. What is its area?",
        choices: ["20 m²", "40 m²", "13 m²"],
        answer: 0,
        curriculumLink:
          "Year 6 Maths: calculate the area of parallelograms and triangles",
      },
    },
    {
      id: "starfall-isle.mend-the-periscope",
      title: "Mend the periscope",
      at: { kind: "thing", id: "starfall-isle.periscope" },
      needs: "starfall-isle.small-mirror",
      gives: "starfall-isle.telescope-lens",
      ask: "A tall brass periscope for peeping over the high wall. One of its two mirrors is missing.",
      hintBy: "starfall-isle.ren-nakamura",
      hint: "A periscope needs two mirrors to bounce the light into your eye. Find a small mirror to fill the gap.",
      solved:
        "You slot in the mirror and peep through. A big lens is sitting in a nest just over the wall! You hook it down with the periscope's handle.",
    },
    {
      id: "starfall-isle.lens-for-professor-vega",
      title: "Help Professor Vega",
      at: { kind: "islander", id: "starfall-isle.professor-vega" },
      needs: "starfall-isle.telescope-lens",
      gives: "starfall-isle.observatory-key",
      ask: "A magpie stole the lens from my great telescope! Without it, I can't see where the signal is coming from.",
      hintBy: "starfall-isle.ines-moreno",
      hint: "Magpies love shiny things, and they hide them in nests too high to see. A mended periscope would spot it.",
      solved:
        '"My lens! Clever, clever you. Here is the observatory key. Go in and see the stars for yourself!"',
    },
    {
      id: "starfall-isle.open-the-observatory",
      title: "Open the observatory",
      at: { kind: "thing", id: "starfall-isle.observatory-door" },
      needs: "starfall-isle.observatory-key",
      ask: "A domed observatory with a heavy purple door. Its lock is shaped like a comet.",
      hintBy: "starfall-isle.dr-okoro",
      hint: "Only Professor Vega has the key to the observatory, and she won't open up until her telescope works.",
      solved:
        "The door swings open and the dome slides back. Through the great telescope, the stars shine brighter than ever.",
      question: {
        prompt: "How are we able to see a star in the night sky?",
        choices: [
          "Light from the star travels in straight lines into our eyes",
          "Our eyes send out beams of light that reach the star",
          "The dark sky reflects the star's picture onto our faces",
        ],
        answer: 0,
        curriculumLink:
          "Year 6 Science: explain that we see things because light travels from light sources to our eyes or from light sources to objects and then to our eyes",
      },
    },
    {
      id: "starfall-isle.plant-the-garden",
      title: "Plant the constellation garden",
      at: { kind: "thing", id: "starfall-isle.constellation-garden" },
      needs: "starfall-isle.bag-of-seeds",
      gives: "starfall-isle.giant-sunflower",
      ask: "Flower beds laid out in the shapes of constellations. The Great Bear bed is completely empty.",
      hintBy: "starfall-isle.firefighter-brennan",
      hint: "The constellation garden needs planting. In low gravity, seeds shoot up in seconds!",
      solved:
        "You sprinkle the seeds in the shape of the Great Bear. Whoosh! A giant sunflower springs up, packed with seeds.",
    },
    {
      id: "starfall-isle.sunflower-for-ines-moreno",
      title: "Help Ines Moreno",
      at: { kind: "islander", id: "starfall-isle.ines-moreno" },
      needs: "starfall-isle.giant-sunflower",
      gives: "starfall-isle.bird-feeder",
      ask: "My big-beaked finches are hungry, and they only eat hard seeds. Soft food just won't do for those strong beaks!",
      hintBy: "starfall-isle.ines-moreno",
      hint: "Sunflowers are full of hard seeds, and the constellation garden grows them fast. Plant some!",
      solved:
        'Ines cracks the sunflower seeds into a feeder. "Perfect! Take this to the aviary. The finches will go wild!"',
    },
    {
      id: "starfall-isle.feed-the-finches",
      title: "Feed the finches in the aviary",
      at: { kind: "thing", id: "starfall-isle.finch-aviary" },
      needs: "starfall-isle.bird-feeder",
      ask: "A big aviary full of finches. Some have thick, strong beaks and some have thin, pointy ones. They're all tweeting hungrily.",
      hintBy: "starfall-isle.professor-vega",
      hint: "Those finches need feeding. Ines Moreno knows exactly what their beaks are built for.",
      solved:
        "The big-beaked finches crack the seeds open, crunch crunch crunch. The whole aviary bursts into song!",
      question: {
        prompt:
          "Charles Darwin saw that finches on different Galápagos islands had different beaks. Why?",
        choices: [
          "Each beak was adapted to the food found on its island",
          "The finches sharpened their beaks on rocks",
          "The finches swapped beaks with each other",
        ],
        answer: 0,
        curriculumLink:
          "Year 6 Science: identify how animals and plants are adapted to suit their environment in different ways and that adaptation may lead to evolution",
      },
    },
    {
      id: "starfall-isle.fix-the-dish",
      title: "Fix the satellite dish",
      at: { kind: "thing", id: "starfall-isle.satellite-dish" },
      needs: "starfall-isle.brass-gear",
      gives: "starfall-isle.coded-message",
      ask: "A huge satellite dish pointing at the sky. It's stuck, and there's a gap in its gears where one is missing.",
      hintBy: "starfall-isle.sparks-mirza",
      hint: "The dish can't turn to catch the signal with a gear missing. Keep an eye out for a brass one.",
      solved:
        "You fit the gear and the dish swings round to face the stars. Its printer chatters out a coded message!",
    },
    {
      id: "starfall-isle.message-for-ivy-blackwood",
      title: "Help Ivy Blackwood",
      at: { kind: "islander", id: "starfall-isle.ivy-blackwood" },
      needs: "starfall-isle.coded-message",
      gives: "starfall-isle.safe-combination",
      ask: "My safe locked itself when the signal arrived, and the new combination is hidden in a coded message from the stars. But nobody has caught the message!",
      hintBy: "starfall-isle.ivy-blackwood",
      hint: "Messages from space are caught by the satellite dish, but it's stuck. It's missing a gear, I believe.",
      solved:
        'Ivy scribbles, frowns, then grins. "Cracked it! The combination is on this scrap of paper. Off you go to my safe!"',
    },
    {
      id: "starfall-isle.open-the-safe",
      title: "Open the codebreaker's safe",
      at: { kind: "thing", id: "starfall-isle.codebreakers-safe" },
      needs: "starfall-isle.safe-combination",
      ask: "A heavy iron safe with a number dial. Painted on the door: BLETCHLEY PARK, 1940.",
      hintBy: "starfall-isle.dr-okoro",
      hint: "That safe only opens with the secret combination, and only a codebreaker could crack it.",
      solved:
        "Click, click, clunk! The safe opens. Inside is an old code machine, a little like the one Ivy's heroes cracked long ago.",
      question: {
        prompt:
          "In the Second World War, codebreakers at Bletchley Park cracked the secret messages of which German code machine?",
        choices: ["Enigma", "The Spinning Jenny", "The Rosetta Stone"],
        answer: 0,
        curriculumLink:
          "Year 6 History: a study of an aspect or theme in British history that extends pupils' chronological knowledge beyond 1066, such as a significant turning point in British history like the Second World War",
      },
    },
    {
      id: "starfall-isle.bounce-for-the-balloon",
      title: "Bounce on the moon bounce",
      at: { kind: "thing", id: "starfall-isle.moon-bounce" },
      needs: "starfall-isle.long-net",
      gives: "starfall-isle.weather-balloon",
      ask: "A squishy purple moon bounce. A white weather balloon is drifting high above it, just out of reach.",
      hintBy: "starfall-isle.officer-achebe",
      hint: "One big bounce in low gravity will send you sky-high. Take something long to catch that balloon with.",
      solved:
        "Boing! You bounce higher than a house and scoop the weather balloon out of the air with the net.",
    },
    {
      id: "starfall-isle.balloon-for-sky-adeyemi",
      title: "Help Sky Adeyemi",
      at: { kind: "islander", id: "starfall-isle.sky-adeyemi" },
      needs: "starfall-isle.weather-balloon",
      gives: "starfall-isle.weather-compass",
      ask: "My weather balloon floated off before I could read its sensor! It's somewhere up in the air, bobbing about.",
      hintBy: "starfall-isle.sky-adeyemi",
      hint: "It got caught in the air above the moon bounce. A really big bounce and a net should reach it.",
      solved:
        '"My balloon! The readings are all here. Take this compass for the weather station\'s wind arrow, would you?"',
    },
    {
      id: "starfall-isle.fix-the-weather-station",
      title: "Fix the weather station",
      at: { kind: "thing", id: "starfall-isle.weather-station" },
      needs: "starfall-isle.weather-compass",
      ask: "A white weather station with a spinning wind arrow and a globe on top. Its compass is missing, so the arrow just spins.",
      hintBy: "starfall-isle.ines-moreno",
      hint: "The weather station can't tell which way the wind blows without a compass. Sky Adeyemi has one.",
      solved:
        "You fit the compass and the wind arrow settles. The globe on top lights up with a glowing line round its middle.",
      question: {
        prompt:
          "Which imaginary line runs round the middle of the Earth at 0° latitude?",
        choices: ["The Equator", "The Prime Meridian", "The Arctic Circle"],
        answer: 0,
        curriculumLink:
          "Year 6 Geography: identify the position and significance of latitude, longitude, Equator, Northern Hemisphere, Southern Hemisphere, the Tropics of Cancer and Capricorn, Arctic and Antarctic Circle, the Prime/Greenwich Meridian and time zones",
      },
    },
    {
      id: "starfall-isle.wake-up-bolt",
      title: "Wake up Bolt the robot",
      at: { kind: "thing", id: "starfall-isle.workshop-robot" },
      needs: "starfall-isle.computer-chip",
      gives: "starfall-isle.robot-spanner",
      ask: "A robot standing perfectly still, clutching something shiny. There's an empty slot in its head where a chip should go.",
      hintBy: "starfall-isle.firefighter-brennan",
      hint: "That robot has no brain at the moment! It needs a computer chip popped into its head.",
      solved:
        'You click in the chip and Bolt\'s eyes light up. "BEEP. SORRY. I BORROWED THIS." It hands you a shiny spanner.',
    },
    {
      id: "starfall-isle.spanner-for-ren-nakamura",
      title: "Help Ren Nakamura",
      at: { kind: "islander", id: "starfall-isle.ren-nakamura" },
      needs: "starfall-isle.robot-spanner",
      gives: "starfall-isle.glass-prism",
      ask: "My favourite spanner has vanished! I bet one of my robots has borrowed it again. They're always polishing it.",
      hintBy: "starfall-isle.ren-nakamura",
      hint: "Bolt the robot loves shiny things, but he's switched off. Wake him up with a chip and he'll own up.",
      solved:
        '"Bolt, you rascal! Thank you. Here, take this glass prism I\'ve been polishing. It goes on the prism stand."',
    },
    {
      id: "starfall-isle.set-the-prism",
      title: "Set the rainbow prism",
      at: { kind: "thing", id: "starfall-isle.prism-stand" },
      needs: "starfall-isle.glass-prism",
      ask: "A stand with a beam of light shining across it, and a triangle-shaped dip on top. Bolt is standing in the beam, casting a robot-shaped shadow.",
      hintBy: "starfall-isle.ivy-blackwood",
      hint: "That stand is waiting for a triangle of glass. Ren Nakamura has one, if her spanner turns up.",
      solved:
        "You set the prism in place and the light splits into a dazzling rainbow. Bolt's shadow does a little robot dance.",
      question: {
        prompt: "Why does Bolt's shadow have the same shape as Bolt?",
        choices: [
          "Light travels in straight lines, so Bolt blocks it in his own shape",
          "Light bends round Bolt and draws his outline",
          "Shadows are made of dark light that copies things",
        ],
        answer: 0,
        curriculumLink:
          "Year 6 Science: use the idea that light travels in straight lines to explain why shadows have the same shape as the objects that cast them",
      },
    },
    {
      id: "starfall-isle.open-the-star-chart-chest",
      title: "Open the star chart chest",
      at: { kind: "thing", id: "starfall-isle.star-chart-chest" },
      needs: "starfall-isle.silver-star-key",
      gives: "starfall-isle.lost-star-map",
      ask: "A midnight-blue chest covered in silver stars. Its keyhole is shaped like a star, too.",
      hintBy: "starfall-isle.sky-adeyemi",
      hint: "A star-shaped keyhole needs a star-shaped key. Look for one twinkling somewhere on the island.",
      solved:
        "Click! The lid lifts, and there, rolled up safe and sound, is the observatory's lost star map!",
    },
    {
      id: "starfall-isle.map-for-sparks-mirza",
      title: "Help Sparks Mirza",
      at: { kind: "islander", id: "starfall-isle.sparks-mirza" },
      needs: "starfall-isle.lost-star-map",
      gives: "starfall-isle.morse-code-book",
      ask: "I want to reply to the signal, but I don't know which star it's coming from! I need the observatory's star map.",
      hintBy: "starfall-isle.sparks-mirza",
      hint: "The star map was locked away in a chest for safe keeping. It opens with a silver key shaped like a star.",
      solved:
        '"There it is: the signal\'s coming from Vega! Take my Morse code book and flash our reply on the Morse lamp."',
    },
    {
      id: "starfall-isle.flash-the-reply",
      title: "Flash a reply to the stars",
      at: { kind: "thing", id: "starfall-isle.morse-lamp" },
      needs: "starfall-isle.morse-code-book",
      ask: "A tall lamp that flashes long and short beams at the sky. A note reads: WRITE YOUR REPLY, THEN FLASH IT.",
      hintBy: "starfall-isle.officer-achebe",
      hint: "To flash a message, you need to know the dots and dashes. Sparks Mirza has a Morse code book.",
      solved:
        "Flash, flash-flash, flash! Your reply zooms off to the stars, and the signal beeps back happily. Starfall Isle has made friends in space!",
      question: {
        prompt: "Which sentence is written in the passive voice?",
        choices: [
          "The reply was sent to the stars by the radio operator.",
          "The radio operator sent the reply to the stars.",
          "The radio operator is sending the reply to the stars.",
        ],
        answer: 0,
        curriculumLink:
          "Year 6 English: use the passive voice to affect the presentation of information in a sentence",
      },
    },
  ],
};
