import type { IslandQuest } from "../island-quest-rules.js";

/**
 * Jungle Reach's Quest, for Year 4: the Festival of the River Spirits is
 * tonight, but the research station has gone dark and the golden jaguar
 * is locked in the Maya temple. Its questions come from the Year 4
 * National Curriculum.
 */
export const jungleReachQuest: IslandQuest = {
  islandId: "jungle-reach",
  title: "The Golden Jaguar of Jungle Reach",
  story:
    "Tonight is the Festival of the River Spirits, but Jungle Reach is in a terrible tangle! The research station has gone dark, the drums have fallen silent and the golden jaguar is locked away inside the old Maya temple. Pick up what you find, talk to the people of the rainforest, and use what is in your rucksack to get the festival going before the moon rises.",
  trophyName: "Golden Jaguar Explorer",
  lyingFindIds: [
    "jungle-reach.claw-hammer",
    "jungle-reach.spanner",
    "jungle-reach.vine-rope",
    "jungle-reach.magnifying-glass",
    "jungle-reach.fishing-rod",
    "jungle-reach.watering-can",
    "jungle-reach.fishing-net",
    "jungle-reach.giant-leaf",
    "jungle-reach.passion-flower",
    "jungle-reach.trowel",
  ],
  finds: [
    {
      id: "jungle-reach.claw-hammer",
      name: "Claw Hammer",
      about:
        "A sturdy hammer, good for banging in nails and pulling out wonky ones.",
      look: { shape: "hammer", colour: "#78716c", trim: "#92400e" },
    },
    {
      id: "jungle-reach.ranger-whistle",
      name: "Ranger's Whistle",
      about:
        "A green whistle on a lanyard. One blast means: mind the crocodiles!",
      look: { shape: "whistle", colour: "#15803d", trim: "#facc15" },
    },
    {
      id: "jungle-reach.canopy-key",
      name: "Canopy Walkway Key",
      about: "A long iron key with a little carved toucan on its handle.",
      look: { shape: "key", colour: "#475569", trim: "#f97316" },
    },
    {
      id: "jungle-reach.spanner",
      name: "Spanner",
      about:
        "A heavy spanner, slightly muddy. Somebody has been fixing things.",
      look: { shape: "spanner", colour: "#9ca3af", trim: "#2563eb" },
    },
    {
      id: "jungle-reach.big-battery",
      name: "Big Battery",
      about:
        "A chunky battery, still full of power. It says 9 VOLTS on the side.",
      look: { shape: "battery", colour: "#1f2937", trim: "#facc15" },
    },
    {
      id: "jungle-reach.circuit-switch",
      name: "Circuit Switch",
      about:
        "A neat little switch on a green board. Click it on, click it off.",
      look: { shape: "chip", colour: "#16a34a", trim: "#e5e7eb" },
    },
    {
      id: "jungle-reach.vine-rope",
      name: "Coil of Vine Rope",
      about: "Jungle vines twisted into a long, strong rope.",
      look: { shape: "rope", colour: "#4d7c0f", trim: "#a3e635" },
    },
    {
      id: "jungle-reach.bamboo-flute",
      name: "Bamboo Flute",
      about:
        "A flute carved from a stick of bamboo. It plays a soft, hooting tune.",
      look: { shape: "flute", colour: "#d9b26f", trim: "#7c5a2b" },
    },
    {
      id: "jungle-reach.festival-drum",
      name: "Festival Drum",
      about: "A big painted drum with a tight skin. Boom, boom, BOOM!",
      look: { shape: "drum", colour: "#dc2626", trim: "#fde68a" },
    },
    {
      id: "jungle-reach.magnifying-glass",
      name: "Magnifying Glass",
      about: "A brass magnifying glass that makes tiny things look enormous.",
      look: { shape: "magnifier", colour: "#b8860b", trim: "#bae6fd" },
    },
    {
      id: "jungle-reach.glyph-scroll",
      name: "Glyph Scroll",
      about: "A tiny rolled-up scroll covered in Maya picture-writing.",
      look: { shape: "scroll", colour: "#fef3c7", trim: "#b91c1c" },
    },
    {
      id: "jungle-reach.jade-jaguar-key",
      name: "Jade Jaguar Key",
      about: "A green stone key shaped like a prowling jaguar.",
      look: { shape: "key", colour: "#10b981", trim: "#064e3b" },
    },
    {
      id: "jungle-reach.fishing-rod",
      name: "Fishing Rod",
      about:
        "A bendy fishing rod with a hook on the end. No worms, thank goodness.",
      look: { shape: "fishing-rod", colour: "#a16207", trim: "#e5e7eb" },
    },
    {
      id: "jungle-reach.dentist-mirror",
      name: "Dentist's Mirror",
      about:
        "A little round mirror on a long handle, for peering at back teeth.",
      look: { shape: "mirror", colour: "#e2e8f0", trim: "#0ea5e9" },
    },
    {
      id: "jungle-reach.giant-toothbrush",
      name: "Giant Toothbrush",
      about:
        "A toothbrush as long as your arm. Who on earth has teeth that big?",
      look: { shape: "paintbrush", colour: "#38bdf8", trim: "#f8fafc" },
    },
    {
      id: "jungle-reach.watering-can",
      name: "Watering Can",
      about: "A yellow watering can with a long spout and a dented bottom.",
      look: { shape: "watering-can", colour: "#facc15", trim: "#65a30d" },
    },
    {
      id: "jungle-reach.basket-of-bananas",
      name: "Basket of Bananas",
      about: "A woven basket piled high with ripe yellow bananas.",
      look: { shape: "basket", colour: "#a16207", trim: "#fde047" },
    },
    {
      id: "jungle-reach.cage-key",
      name: "Rescue Centre Key",
      about: "A brass key on a tag that says RESCUE CENTRE: RELEASE DAY.",
      look: { shape: "key", colour: "#d4a017", trim: "#0f766e" },
    },
    {
      id: "jungle-reach.fishing-net",
      name: "Fishing Net",
      about: "A net on a pole, for scooping things out of the water.",
      look: { shape: "net", colour: "#0e7490", trim: "#a8a29e" },
    },
    {
      id: "jungle-reach.river-compass",
      name: "River Compass",
      about:
        "A dripping brass compass. It must have been in the water for days.",
      look: { shape: "compass", colour: "#b45309", trim: "#e0f2fe" },
    },
    {
      id: "jungle-reach.raft-lantern",
      name: "Raft Lantern",
      about: "A lantern that glows blue, ready for a river trip at night.",
      look: { shape: "lantern", colour: "#1e3a8a", trim: "#7dd3fc" },
    },
    {
      id: "jungle-reach.giant-leaf",
      name: "Giant Leaf",
      about: "A leaf so big you could use it as an umbrella.",
      look: { shape: "leaf", colour: "#22c55e", trim: "#14532d" },
    },
    {
      id: "jungle-reach.orchid-seeds",
      name: "Orchid Seeds",
      about: "A tiny bag of rare orchid seeds, a little nibbled at the corner.",
      look: { shape: "seed-bag", colour: "#e879f9", trim: "#86198f" },
    },
    {
      id: "jungle-reach.cacao-beans",
      name: "Bag of Cacao Beans",
      about: "Knobbly brown beans. The Maya made chocolate drinks from these!",
      look: { shape: "seed-bag", colour: "#78350f", trim: "#fbbf24" },
    },
    {
      id: "jungle-reach.passion-flower",
      name: "Passion Flower",
      about:
        "A purple flower with frilly petals and a sweet smell. Bees adore it.",
      look: { shape: "flower", colour: "#a855f7", trim: "#fef08a" },
    },
    {
      id: "jungle-reach.jar-of-honey",
      name: "Jar of Jungle Honey",
      about: "Runny golden honey from the rainforest's stingless bees.",
      look: { shape: "jar", colour: "#f59e0b", trim: "#fef3c7" },
    },
    {
      id: "jungle-reach.beeswax-candle",
      name: "Beeswax Candle",
      about: "A golden candle that smells faintly of honey.",
      look: { shape: "candle", colour: "#fcd34d", trim: "#f97316" },
    },
    {
      id: "jungle-reach.trowel",
      name: "Garden Trowel",
      about: "A small spade with a red handle, for digging and scooping soil.",
      look: { shape: "shovel", colour: "#9ca3af", trim: "#dc2626" },
    },
    {
      id: "jungle-reach.fire-bell",
      name: "Fire Bell",
      about: "A scorched brass bell. Clang it if there's ever a fire!",
      look: { shape: "bell", colour: "#d97706", trim: "#7f1d1d" },
    },
    {
      id: "jungle-reach.coded-letter",
      name: "Coded Letter",
      about:
        "A letter with strange letters on it: X, L, V and I. A secret code?",
      look: { shape: "letter", colour: "#fef9c3", trim: "#1d4ed8" },
    },
  ],
  islanders: [
    {
      id: "jungle-reach.ranger-amara",
      name: "Ranger Amara",
      role: "Park Ranger",
      look: {
        skin: "#5c3a28",
        hair: "#111111",
        hairStyle: "curly",
        hasBeard: false,
        outfit: "uniform",
        top: "#4d7c0f",
        legs: "#78716c",
        hat: "cap",
        hatColour: "#365314",
        held: "clipboard",
      },
      greeting:
        "Hello, explorer! I'm Ranger Amara. I look after every tree, trail and toucan in Jungle Reach.",
      thanks:
        "The walkways are safe and the canopy is open. The rainforest is lucky to have you on its side!",
    },
    {
      id: "jungle-reach.sparky-singh",
      name: "Sparky Singh",
      role: "Electrician",
      look: {
        skin: "#a86b45",
        hair: "#1f1a17",
        hairStyle: "ponytail",
        hasBeard: false,
        outfit: "overalls",
        top: "#1d4ed8",
        legs: "#1d4ed8",
        hat: "hard-hat",
        hatColour: "#facc15",
        held: "spanner",
      },
      greeting:
        "Hiya! I'm Sparky Singh, the electrician. If it buzzes, beeps or lights up, I can fix it.",
      thanks:
        "The research station is glowing again! You're a bright spark, and that's my highest praise.",
    },
    {
      id: "jungle-reach.zuri",
      name: "Zuri",
      role: "Musician",
      look: {
        skin: "#3d2418",
        hair: "#1a1a1a",
        hairStyle: "long",
        hasBeard: false,
        outfit: "dress",
        top: "#f97316",
        legs: "#7c2d12",
        hat: "headscarf",
        hatColour: "#facc15",
        held: "none",
      },
      greeting:
        "Hey there! I'm Zuri. I lead the festival drum circle. Well, I would, if I had a drum!",
      thanks:
        "Listen to those drums! The whole jungle is dancing. You've got rhythm, my friend.",
    },
    {
      id: "jungle-reach.professor-quill",
      name: "Professor Quill",
      role: "Explorer",
      look: {
        skin: "#f3c9a8",
        hair: "#d1d5db",
        hairStyle: "bald",
        hasBeard: true,
        outfit: "coat",
        top: "#a16207",
        legs: "#57534e",
        hat: "explorer-hat",
        hatColour: "#d6b370",
        held: "telescope",
      },
      greeting:
        "Great galloping glyphs! I'm Professor Quill, explorer. I've spent forty years searching for the golden jaguar.",
      thanks:
        "The temple is open and the golden jaguar shines once more. You're a far better explorer than I ever was!",
    },
    {
      id: "jungle-reach.dr-haddad",
      name: "Dr Haddad",
      role: "Doctor",
      look: {
        skin: "#c58c63",
        hair: "#2d2a26",
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
        "Good day! I'm Dr Haddad. I run the jungle clinic, and I'm very keen on clean teeth.",
      thanks:
        "Everyone's teeth are sparkling, even the stone ones! Brush twice a day, and don't forget the back ones.",
    },
    {
      id: "jungle-reach.keeper-tomas",
      name: "Keeper Tomas",
      role: "Zookeeper",
      look: {
        skin: "#e0ac7e",
        hair: "#3b2a1e",
        hairStyle: "short",
        hasBeard: false,
        outfit: "overalls",
        top: "#0f766e",
        legs: "#0f766e",
        hat: "sun-hat",
        hatColour: "#e2c275",
        held: "net",
      },
      greeting:
        "Hola! I'm Keeper Tomas. I run the animal rescue centre: sloths, monkeys, orangutans, the lot.",
      thanks:
        "The monkeys are full, and our toucan is flying free. Every animal in the rainforest thanks you!",
    },
    {
      id: "jungle-reach.river-guide-kai",
      name: "Kai",
      role: "River Guide",
      look: {
        skin: "#b07850",
        hair: "#111827",
        hairStyle: "bun",
        hasBeard: false,
        outfit: "tunic",
        top: "#0ea5e9",
        legs: "#1e293b",
        hat: "cap",
        hatColour: "#0369a1",
        held: "fishing-rod",
      },
      greeting:
        "Ahoy! I'm Kai, the river guide. I take rafts down the river, past the waterfalls and round the crocodiles.",
      thanks:
        "My raft is ready for the festival float. Hop aboard any time, captain!",
    },
    {
      id: "jungle-reach.botanist-mei",
      name: "Mei",
      role: "Botanist",
      look: {
        skin: "#f0d2b0",
        hair: "#1c1917",
        hairStyle: "bun",
        hasBeard: false,
        outfit: "apron",
        top: "#65a30d",
        legs: "#3f6212",
        hat: "flower-crown",
        hatColour: "#f472b6",
        held: "basket",
      },
      greeting:
        "Oh, hello! I'm Mei, the botanist. I study rainforest plants, and there are more kinds here than anywhere else on Earth.",
      thanks:
        "My orchids are planted and the hot chocolate is ready. You have green fingers and a great brain!",
    },
    {
      id: "jungle-reach.beekeeper-bea",
      name: "Bea",
      role: "Beekeeper",
      look: {
        skin: "#f6d3b8",
        hair: "#d99a3e",
        hairStyle: "curly",
        hasBeard: false,
        outfit: "overalls",
        top: "#f8fafc",
        legs: "#e5e7eb",
        hat: "beanie",
        hatColour: "#facc15",
        held: "none",
      },
      greeting:
        "Hi! I'm Bea the beekeeper. Yes, really. My bees are the stingless kind, so they're very friendly.",
      thanks:
        "My bees are buzzing and the beacon is blazing. You're the bee's knees!",
    },
    {
      id: "jungle-reach.firefighter-mendes",
      name: "Firefighter Mendes",
      role: "Firefighter",
      look: {
        skin: "#8d5a3b",
        hair: "#2d2a26",
        hairStyle: "short",
        hasBeard: false,
        outfit: "coat",
        top: "#374151",
        legs: "#1f2937",
        hat: "fire-helmet",
        hatColour: "#dc2626",
        held: "hose",
      },
      greeting:
        "Hello! I'm Firefighter Mendes. I keep the jungle safe from fires, which is tricky when it's this hot.",
      thanks:
        "No smouldering fires, and the safe is open. Remember: never leave a campfire burning!",
    },
  ],
  things: [
    {
      id: "jungle-reach.mangrove-boardwalk",
      name: "Wobbly Mangrove Boardwalk",
      shape: "broken-bridge",
      colour: "#7a5230",
      trim: "#4d7c0f",
    },
    {
      id: "jungle-reach.canopy-gate",
      name: "Canopy Walkway Gate",
      shape: "gate",
      colour: "#57534e",
      trim: "#22c55e",
    },
    {
      id: "jungle-reach.weather-robot",
      name: "Rusty Weather Robot",
      shape: "robot",
      colour: "#94a3b8",
      trim: "#b45309",
    },
    {
      id: "jungle-reach.circuit-garden",
      name: "Circuit Garden",
      shape: "machine",
      colour: "#334155",
      trim: "#fde047",
    },
    {
      id: "jungle-reach.rope-bridge",
      name: "Snapped Rope Bridge",
      shape: "broken-bridge",
      colour: "#a16207",
      trim: "#65a30d",
    },
    {
      id: "jungle-reach.drum-circle",
      name: "Drum Circle",
      shape: "totem",
      colour: "#92400e",
      trim: "#f97316",
    },
    {
      id: "jungle-reach.calendar-stone",
      name: "Maya Calendar Stone",
      shape: "pedestal",
      colour: "#a8a29e",
      trim: "#0d9488",
    },
    {
      id: "jungle-reach.temple-door",
      name: "Maya Temple Door",
      shape: "door",
      colour: "#78716c",
      trim: "#facc15",
    },
    {
      id: "jungle-reach.creek-canoe",
      name: "Crocodile Creek Canoe",
      shape: "boat",
      colour: "#7c4a2d",
      trim: "#16a34a",
    },
    {
      id: "jungle-reach.jaguar-statue",
      name: "Stone Jaguar Statue",
      shape: "statue",
      colour: "#d6d3d1",
      trim: "#4ade80",
    },
    {
      id: "jungle-reach.banana-plantation",
      name: "Banana Plantation",
      shape: "garden-bed",
      colour: "#6b4423",
      trim: "#facc15",
    },
    {
      id: "jungle-reach.rescue-cage",
      name: "Rescue Centre Aviary",
      shape: "cage",
      colour: "#0f766e",
      trim: "#f97316",
    },
    {
      id: "jungle-reach.waterfall-pool",
      name: "Waterfall Pool",
      shape: "fountain",
      colour: "#0ea5e9",
      trim: "#e0f2fe",
    },
    {
      id: "jungle-reach.river-raft",
      name: "River Raft",
      shape: "boat",
      colour: "#b45309",
      trim: "#1e3a8a",
    },
    {
      id: "jungle-reach.ant-nest",
      name: "Leafcutter Ant Nest",
      shape: "garden-bed",
      colour: "#7c2d12",
      trim: "#84cc16",
    },
    {
      id: "jungle-reach.cocoa-oven",
      name: "Cocoa Oven",
      shape: "oven",
      colour: "#57534e",
      trim: "#ea580c",
    },
    {
      id: "jungle-reach.beehive",
      name: "Empty Beehive",
      shape: "beehive",
      colour: "#d9b26f",
      trim: "#7a5230",
    },
    {
      id: "jungle-reach.spirit-beacon",
      name: "River Spirit Beacon",
      shape: "beacon",
      colour: "#1e3a8a",
      trim: "#fbbf24",
    },
    {
      id: "jungle-reach.smouldering-campfire",
      name: "Smouldering Campfire",
      shape: "campfire",
      colour: "#57534e",
      trim: "#f97316",
    },
    {
      id: "jungle-reach.station-safe",
      name: "Research Station Safe",
      shape: "safe",
      colour: "#475569",
      trim: "#cbd5e1",
    },
  ],
  puzzles: [
    {
      id: "jungle-reach.mend-the-boardwalk",
      title: "Mend the mangrove boardwalk",
      at: { kind: "thing", id: "jungle-reach.mangrove-boardwalk" },
      needs: "jungle-reach.claw-hammer",
      gives: "jungle-reach.ranger-whistle",
      ask: "A wooden boardwalk over the mangrove swamp. One plank is loose and wobbles like a jelly. Something green is wedged underneath.",
      hintBy: "jungle-reach.keeper-tomas",
      hint: "That boardwalk plank has been wobbling for weeks. A few good whacks with a hammer would fix it.",
      solved:
        "Bang, bang, bang! The plank is fixed, and as you press it down a green ranger's whistle pops out from underneath.",
    },
    {
      id: "jungle-reach.whistle-for-ranger-amara",
      title: "Help Ranger Amara",
      at: { kind: "islander", id: "jungle-reach.ranger-amara" },
      needs: "jungle-reach.ranger-whistle",
      gives: "jungle-reach.canopy-key",
      ask: "I can't open the canopy walkway without my whistle. How else will I warn people when a crocodile gets cheeky? I dropped it somewhere on the boardwalk.",
      hintBy: "jungle-reach.ranger-amara",
      hint: "My whistle fell through a gap in the boardwalk. Mend the loose plank and you'll find it.",
      solved:
        "Pheeeep! \"That's the sound of safety! Here's the key to the canopy walkway. The view from up there is wonderful.\"",
    },
    {
      id: "jungle-reach.open-the-canopy-gate",
      title: "Open the canopy walkway",
      at: { kind: "thing", id: "jungle-reach.canopy-gate" },
      needs: "jungle-reach.canopy-key",
      ask: "An iron gate with a toucan-shaped lock. Beyond it, a walkway stretches through the treetops. A sign says: KEEPERS OF THE KEY ONLY.",
      hintBy: "jungle-reach.river-guide-kai",
      hint: "Only Ranger Amara has the key to the canopy walkway, and she won't open it without her whistle.",
      solved:
        "The gate swings open. You stroll along the walkway, high above the forest floor, with monkeys swinging beside you.",
      question: {
        prompt:
          "From the canopy you can see rainforest for miles. Most tropical rainforests grow near which imaginary line around the middle of the Earth?",
        choices: ["The Equator", "The Arctic Circle", "The Prime Meridian"],
        answer: 0,
        curriculumLink:
          "Year 4 Geography: describe and understand key aspects of physical geography, including climate zones, biomes and vegetation belts, and identify the position of the Equator",
      },
    },
    {
      id: "jungle-reach.fix-the-weather-robot",
      title: "Fix the weather robot",
      at: { kind: "thing", id: "jungle-reach.weather-robot" },
      needs: "jungle-reach.spanner",
      gives: "jungle-reach.big-battery",
      ask: "A rusty robot that measures the rain. Its hatch is bolted shut, and it beeps sadly every few seconds.",
      hintBy: "jungle-reach.professor-quill",
      hint: "That weather robot's hatch is bolted tight. You'll want a spanner to undo it.",
      solved:
        "A few turns of the spanner and the hatch creaks open. Inside is a big battery, still full of power!",
    },
    {
      id: "jungle-reach.battery-for-sparky-singh",
      title: "Help Sparky Singh",
      at: { kind: "islander", id: "jungle-reach.sparky-singh" },
      needs: "jungle-reach.big-battery",
      gives: "jungle-reach.circuit-switch",
      ask: "The research station has gone dark, and I need a big battery to power it up. The weather robot borrowed one and never gave it back!",
      hintBy: "jungle-reach.sparky-singh",
      hint: "The battery is locked inside the weather robot. Its hatch is held on with bolts.",
      solved:
        '"Fully charged! Now take this switch to the circuit garden and click it into place. Then we\'ll see some light!"',
    },
    {
      id: "jungle-reach.light-the-circuit-garden",
      title: "Light up the circuit garden",
      at: { kind: "thing", id: "jungle-reach.circuit-garden" },
      needs: "jungle-reach.circuit-switch",
      ask: "A garden of wires, bulbs and batteries that powers the research station. There's an empty gap in the circuit where a switch should go.",
      hintBy: "jungle-reach.beekeeper-bea",
      hint: "The circuit garden is missing its switch. Sparky Singh has one, if you can find her a battery.",
      solved:
        "Click! The switch closes the circuit, and every bulb in the research station blinks on. Hooray!",
      question: {
        prompt:
          "The circuit has a battery, a bulb and a switch. What happens to the bulb when you open the switch?",
        choices: [
          "It goes out, because the circuit is broken",
          "It shines even brighter",
          "It changes colour",
        ],
        answer: 0,
        curriculumLink:
          "Year 4 Science: recognise that a switch opens and closes a circuit and associate this with whether or not a lamp lights in a simple series circuit",
      },
    },
    {
      id: "jungle-reach.mend-the-rope-bridge",
      title: "Mend the rope bridge",
      at: { kind: "thing", id: "jungle-reach.rope-bridge" },
      needs: "jungle-reach.vine-rope",
      gives: "jungle-reach.bamboo-flute",
      ask: "A rope bridge over a deep gorge. One rope has snapped, and it dangles uselessly. Something bamboo is lying on the far side.",
      hintBy: "jungle-reach.ranger-amara",
      hint: "That rope bridge needs a new rope. Vines make the strongest rope in the jungle!",
      solved:
        "You tie the vine rope tight and tiptoe across. Waiting on the other side is a bamboo flute.",
    },
    {
      id: "jungle-reach.flute-for-zuri",
      title: "Help Zuri",
      at: { kind: "islander", id: "jungle-reach.zuri" },
      needs: "jungle-reach.bamboo-flute",
      gives: "jungle-reach.festival-drum",
      ask: "I left my bamboo flute on the other side of the gorge, and then the bridge snapped! I can't start the music without it.",
      hintBy: "jungle-reach.zuri",
      hint: "My flute is across the rope bridge. Mend the broken rope and you can fetch it.",
      solved:
        'Zuri plays a happy tune. "Toot toot! Now, this festival drum belongs in the drum circle. Give it a good BOOM!"',
    },
    {
      id: "jungle-reach.start-the-drum-circle",
      title: "Start the drum circle",
      at: { kind: "thing", id: "jungle-reach.drum-circle" },
      needs: "jungle-reach.festival-drum",
      ask: "A ring of carved posts where the festival drummers gather. In the middle is an empty space, the perfect size for a big drum.",
      hintBy: "jungle-reach.dr-haddad",
      hint: "The drum circle can't start without its big festival drum. Zuri looks after it.",
      solved:
        "BOOM! BOOM! The drum shakes the leaves, and soon the whole Island is drumming along.",
      question: {
        prompt:
          "You hit the festival drum much harder than before. What happens to the sound?",
        choices: [
          "It gets louder, because the drum skin vibrates more strongly",
          "It gets quieter",
          "It stops making any sound",
        ],
        answer: 0,
        curriculumLink:
          "Year 4 Science: find patterns between the volume of a sound and the strength of the vibrations that produced it",
      },
    },
    {
      id: "jungle-reach.read-the-calendar-stone",
      title: "Read the Maya calendar stone",
      at: { kind: "thing", id: "jungle-reach.calendar-stone" },
      needs: "jungle-reach.magnifying-glass",
      gives: "jungle-reach.glyph-scroll",
      ask: "A round stone covered in tiny carved pictures. They're far too small to read with your eyes alone.",
      hintBy: "jungle-reach.botanist-mei",
      hint: "The carvings on the calendar stone are teeny. A magnifying glass would make them big enough to read.",
      solved:
        "Through the glass, you spot a crack in the stone. Tucked inside is a tiny scroll of Maya glyphs!",
    },
    {
      id: "jungle-reach.scroll-for-professor-quill",
      title: "Help Professor Quill",
      at: { kind: "islander", id: "jungle-reach.professor-quill" },
      needs: "jungle-reach.glyph-scroll",
      gives: "jungle-reach.jade-jaguar-key",
      ask: "Legend says a scroll tells where the temple key is hidden. It's tucked away somewhere on the calendar stone, but my old eyes can't spot it!",
      hintBy: "jungle-reach.professor-quill",
      hint: "The scroll is hidden in the calendar stone's carvings. You'll need a magnifying glass to see it.",
      solved:
        '"Great galloping glyphs! It says the key is in my own hat! Well I never." He hands you a jade jaguar key.',
    },
    {
      id: "jungle-reach.open-the-temple",
      title: "Open the Maya temple",
      at: { kind: "thing", id: "jungle-reach.temple-door" },
      needs: "jungle-reach.jade-jaguar-key",
      ask: "A huge stone door at the top of the temple steps, with a jaguar-shaped keyhole. Behind it, something golden gleams.",
      hintBy: "jungle-reach.zuri",
      hint: "The temple door opens with a jade jaguar key. Professor Quill has been hunting for it for years.",
      solved:
        "The door grinds open and there sits the golden jaguar, shining in the torchlight. Professor Quill does a little dance!",
      question: {
        prompt:
          "The ancient Maya lived in the rainforests of Central America. What were they famous for building?",
        choices: [
          "Stepped stone pyramids",
          "Castles with moats and drawbridges",
          "Wooden longships",
        ],
        answer: 0,
        curriculumLink:
          "Year 4 History: a non-European society that provides contrasts with British history, such as the Mayan civilisation c. AD 900",
      },
    },
    {
      id: "jungle-reach.fish-in-the-canoe",
      title: "Fish in the sunken canoe",
      at: { kind: "thing", id: "jungle-reach.creek-canoe" },
      needs: "jungle-reach.fishing-rod",
      gives: "jungle-reach.dentist-mirror",
      ask: "A half-sunk canoe in Crocodile Creek. Something shiny is lying in the bottom, and a crocodile is grinning at it.",
      hintBy: "jungle-reach.river-guide-kai",
      hint: "Never put your hands in Crocodile Creek! A fishing rod could hook things out from a safe distance.",
      solved:
        "You cast the line, hook the shiny thing and reel it in. It's a dentist's mirror! The crocodile looks rather disappointed.",
    },
    {
      id: "jungle-reach.mirror-for-dr-haddad",
      title: "Help Dr Haddad",
      at: { kind: "islander", id: "jungle-reach.dr-haddad" },
      needs: "jungle-reach.dentist-mirror",
      gives: "jungle-reach.giant-toothbrush",
      ask: "I was checking a crocodile's teeth, and it snapped at my little mirror! It fell into an old canoe, and I'm not going back for it.",
      hintBy: "jungle-reach.dr-haddad",
      hint: "My mirror is in the canoe in Crocodile Creek. Hook it out, and keep your fingers well away!",
      solved:
        '"My mirror! Thank you. Now, the stone jaguar has terribly mossy teeth. Here\'s my giant toothbrush."',
    },
    {
      id: "jungle-reach.brush-the-jaguar",
      title: "Brush the stone jaguar's teeth",
      at: { kind: "thing", id: "jungle-reach.jaguar-statue" },
      needs: "jungle-reach.giant-toothbrush",
      ask: "A stone jaguar guards the path, mouth wide open. Its teeth are green with moss. Yuck!",
      hintBy: "jungle-reach.keeper-tomas",
      hint: "Those stone teeth need a good scrub with a really big toothbrush. Dr Haddad keeps one for emergencies.",
      solved:
        "Scrub, scrub, scrub! The jaguar's teeth gleam white, and its stone eyes seem to wink at you.",
      question: {
        prompt:
          "The jaguar's long, pointed teeth grip and tear food. You have four of them too. What are they called?",
        choices: ["Canines", "Molars", "Incisors"],
        answer: 0,
        curriculumLink:
          "Year 4 Science: identify the different types of teeth in humans and their simple functions",
      },
    },
    {
      id: "jungle-reach.water-the-bananas",
      title: "Water the banana plantation",
      at: { kind: "thing", id: "jungle-reach.banana-plantation" },
      needs: "jungle-reach.watering-can",
      gives: "jungle-reach.basket-of-bananas",
      ask: "Rows of banana plants with droopy leaves. It hasn't rained for days, which is very odd for a rainforest.",
      hintBy: "jungle-reach.botanist-mei",
      hint: "Banana plants are thirsty things. Give them a drink with a watering can.",
      solved:
        "The plants perk up at once, and a bunch of ripe bananas drops neatly into a basket. Lunch is served!",
    },
    {
      id: "jungle-reach.bananas-for-keeper-tomas",
      title: "Help Keeper Tomas",
      at: { kind: "islander", id: "jungle-reach.keeper-tomas" },
      needs: "jungle-reach.basket-of-bananas",
      gives: "jungle-reach.cage-key",
      ask: "The monkeys at the rescue centre are hungry and grumpy, and a grumpy monkey throws things! I need a basket of bananas, fast.",
      hintBy: "jungle-reach.keeper-tomas",
      hint: "Bananas grow on the plantation, but the plants are too thirsty to fruit. Water them!",
      solved:
        'The monkeys munch happily. "Gracias! Today our rescued toucan is ready to fly free. Here\'s the key to the aviary."',
    },
    {
      id: "jungle-reach.free-the-toucan",
      title: "Set the toucan free",
      at: { kind: "thing", id: "jungle-reach.rescue-cage" },
      needs: "jungle-reach.cage-key",
      ask: "A big, airy aviary. Inside, a toucan with a mended wing hops about, looking out at the trees.",
      hintBy: "jungle-reach.ranger-amara",
      hint: "That toucan is all better now. Keeper Tomas has the aviary key, once the monkeys are fed.",
      solved:
        "You open the door and the toucan flaps out into the canopy, its rainbow beak flashing. Off it goes!",
      question: {
        prompt:
          "Here is a rainforest food chain: fig tree → toucan → boa snake. Which is the producer?",
        choices: ["The fig tree", "The toucan", "The boa snake"],
        answer: 0,
        curriculumLink:
          "Year 4 Science: construct and interpret a variety of food chains, identifying producers, predators and prey",
      },
    },
    {
      id: "jungle-reach.net-the-compass",
      title: "Search the waterfall pool",
      at: { kind: "thing", id: "jungle-reach.waterfall-pool" },
      needs: "jungle-reach.fishing-net",
      gives: "jungle-reach.river-compass",
      ask: "A deep, clear pool at the bottom of a roaring waterfall. Something brass glints far below the bubbles.",
      hintBy: "jungle-reach.firefighter-mendes",
      hint: "The waterfall pool is too deep to paddle in. A fishing net on a long pole could scoop things out.",
      solved:
        "You swish the net through the water and scoop up a dripping brass compass!",
    },
    {
      id: "jungle-reach.compass-for-kai",
      title: "Help Kai the river guide",
      at: { kind: "islander", id: "jungle-reach.river-guide-kai" },
      needs: "jungle-reach.river-compass",
      gives: "jungle-reach.raft-lantern",
      ask: "I can't take the festival raft out without my compass. It slipped off my belt when I went swimming under the waterfall!",
      hintBy: "jungle-reach.river-guide-kai",
      hint: "My compass sank in the waterfall pool. You'll need something to scoop it out with.",
      solved:
        '"My trusty compass! Now I\'ll never get lost. Take this lantern and hang it on the raft for the night parade."',
    },
    {
      id: "jungle-reach.light-the-raft",
      title: "Light up the river raft",
      at: { kind: "thing", id: "jungle-reach.river-raft" },
      needs: "jungle-reach.raft-lantern",
      ask: "A log raft tied up at the jetty, decorated with flowers. There's an empty hook at the front for a lantern.",
      hintBy: "jungle-reach.sparky-singh",
      hint: "The raft can't sail in the dark without a lantern. Kai keeps a special blue one.",
      solved:
        "You hang the lantern and the raft glows blue. It floats gently off down the river, ready for the parade.",
      question: {
        prompt:
          "The raft has floated seven tenths of a kilometre. How do you write seven tenths as a decimal?",
        choices: ["0.7", "7.0", "0.07"],
        answer: 0,
        curriculumLink:
          "Year 4 Maths: recognise and write decimal equivalents of any number of tenths or hundredths",
      },
    },
    {
      id: "jungle-reach.feed-the-ants",
      title: "Trade with the leafcutter ants",
      at: { kind: "thing", id: "jungle-reach.ant-nest" },
      needs: "jungle-reach.giant-leaf",
      gives: "jungle-reach.orchid-seeds",
      ask: "A busy nest of leafcutter ants, marching in a long line. One little ant is pushing a tiny bag out of the way.",
      hintBy: "jungle-reach.beekeeper-bea",
      hint: "Leafcutter ants love leaves, and the bigger the better! Bring them a giant one.",
      solved:
        "The ants carry the giant leaf inside, and in return they push out a tiny bag of orchid seeds. Fair swap!",
    },
    {
      id: "jungle-reach.seeds-for-mei",
      title: "Help Mei the botanist",
      at: { kind: "islander", id: "jungle-reach.botanist-mei" },
      needs: "jungle-reach.orchid-seeds",
      gives: "jungle-reach.cacao-beans",
      ask: "My rare orchid seeds have vanished! I think some very small, very busy someones carried them off.",
      hintBy: "jungle-reach.botanist-mei",
      hint: "The leafcutter ants took my seeds. They might give them back if you offer them something they like.",
      solved:
        '"My orchids! Thank you! Here are some cacao beans. Roast them in the cocoa oven for the festival hot chocolate."',
    },
    {
      id: "jungle-reach.roast-the-cacao",
      title: "Roast the cacao beans",
      at: { kind: "thing", id: "jungle-reach.cocoa-oven" },
      needs: "jungle-reach.cacao-beans",
      ask: "A clay oven, warm and ready, with seven empty trays. It smells faintly of chocolate.",
      hintBy: "jungle-reach.professor-quill",
      hint: "The Maya made chocolate drinks from roasted cacao beans. Mei grows them, but she's busy worrying about her seeds.",
      solved:
        "The beans roast and the air fills with chocolatey smells. Festival hot chocolate for everyone!",
      question: {
        prompt:
          "You fill 7 trays with 8 cacao beans on each. How many beans is that altogether?",
        choices: ["56", "54", "63"],
        answer: 0,
        curriculumLink:
          "Year 4 Maths: recall multiplication and division facts for multiplication tables up to 12 × 12",
      },
    },
    {
      id: "jungle-reach.call-the-bees-home",
      title: "Call the bees home",
      at: { kind: "thing", id: "jungle-reach.beehive" },
      needs: "jungle-reach.passion-flower",
      gives: "jungle-reach.jar-of-honey",
      ask: "A wooden beehive, silent and still. The bees have wandered off, but they left a jar of honey on the top.",
      hintBy: "jungle-reach.dr-haddad",
      hint: "Bees can't resist a sweet-smelling flower. Put one by the empty hive and they'll buzz back.",
      solved:
        "The bees smell the passion flower and zoom home in a happy cloud. You pick up the jar of honey they left out.",
    },
    {
      id: "jungle-reach.honey-for-bea",
      title: "Help Bea the beekeeper",
      at: { kind: "islander", id: "jungle-reach.beekeeper-bea" },
      needs: "jungle-reach.jar-of-honey",
      gives: "jungle-reach.beeswax-candle",
      ask: "My bees have gone wandering and I can't reach the hive's honey till they're back. I promised a jar for the festival feast!",
      hintBy: "jungle-reach.beekeeper-bea",
      hint: "My bees love sweet flowers. Tempt them home to the hive and the honey's all yours.",
      solved:
        "\"Buzzing brilliant! Here's a beeswax candle. It's just right for lighting the River Spirit Beacon.\"",
    },
    {
      id: "jungle-reach.light-the-beacon",
      title: "Light the River Spirit Beacon",
      at: { kind: "thing", id: "jungle-reach.spirit-beacon" },
      needs: "jungle-reach.beeswax-candle",
      ask: "A tall beacon by the river. A sign says: LIGHT ME TO WELCOME THE RIVER SPIRITS. Its candle holder is empty.",
      hintBy: "jungle-reach.firefighter-mendes",
      hint: "The beacon is lit with a beeswax candle. Bea makes those from her bees' wax.",
      solved:
        "The candle flickers into life and the beacon blazes gold. The river sparkles as if the spirits are waving.",
      question: {
        prompt:
          "The hive belongs to lots of bees. Which of these is written correctly?",
        choices: ["the bees' hive", "the bee's hive", "the bees hive"],
        answer: 0,
        curriculumLink:
          "Year 4 English: place the possessive apostrophe accurately in words with regular plurals (for example, girls', boys') and in words with irregular plurals (for example, children's)",
      },
    },
    {
      id: "jungle-reach.put-out-the-campfire",
      title: "Put out the smouldering campfire",
      at: { kind: "thing", id: "jungle-reach.smouldering-campfire" },
      needs: "jungle-reach.trowel",
      gives: "jungle-reach.fire-bell",
      ask: "An explorers' campfire, still smoking. Somebody forgot to put it out! Something brass is poking out of the ashes.",
      hintBy: "jungle-reach.sparky-singh",
      hint: "Never leave a fire smouldering! Cover the embers with soil. A trowel would scoop it nicely.",
      solved:
        "You scoop soil over the embers until the smoke stops. Then you spot a scorched brass bell in the ashes.",
    },
    {
      id: "jungle-reach.bell-for-firefighter-mendes",
      title: "Help Firefighter Mendes",
      at: { kind: "islander", id: "jungle-reach.firefighter-mendes" },
      needs: "jungle-reach.fire-bell",
      gives: "jungle-reach.coded-letter",
      ask: "I've lost my fire bell! I put it down to check a campfire and it vanished. And now I can smell smoke...",
      hintBy: "jungle-reach.firefighter-mendes",
      hint: "My bell is somewhere by the explorers' campfire. Put the fire out safely first, then look in the ashes.",
      solved:
        'Clang clang! "Thank you! I found this letter by the fire. It has the code for the research station safe, but it\'s all in Roman numerals."',
    },
    {
      id: "jungle-reach.open-the-station-safe",
      title: "Open the research station safe",
      at: { kind: "thing", id: "jungle-reach.station-safe" },
      needs: "jungle-reach.coded-letter",
      ask: "A heavy metal safe in the research station. It holds the festival fireworks. Its dial has numbers, but the code is missing.",
      hintBy: "jungle-reach.zuri",
      hint: "The safe code is written on a letter. Firefighter Mendes found it, but she's lost her fire bell.",
      solved:
        "You turn the dial, the safe clicks open and out come the festival fireworks. Whoosh! The Festival of the River Spirits has begun!",
      question: {
        prompt: "The letter says the code is XL. What number is XL?",
        choices: ["40", "60", "14"],
        answer: 0,
        curriculumLink:
          "Year 4 Maths: read Roman numerals to 100 (I to C) and know that over time, the numeral system changed to include the concept of zero and place value",
      },
    },
  ],
};
