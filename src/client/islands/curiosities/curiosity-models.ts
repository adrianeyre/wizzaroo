import type { CuriosityKind, CuriosityModel } from "./curiosity-kit.js";
import { windmillModel } from "./windmill.js";
import { waterMillModel } from "./water-mill.js";
import { scarecrowModel } from "./scarecrow.js";
import { wishingWellModel } from "./wishing-well.js";
import { giantSunflowersModel } from "./giant-sunflowers.js";
import { frogPondModel } from "./frog-pond.js";
import { maypoleModel } from "./maypole.js";
import { rabbitWarrenModel } from "./rabbit-warren.js";
import { haystackSlideModel } from "./haystack-slide.js";
import { snailRaceModel } from "./snail-race.js";
import { weatherStationModel } from "./weather-station.js";
import { picnicSpotModel } from "./picnic-spot.js";
import { bugHotelModel } from "./bug-hotel.js";
import { birdTableModel } from "./bird-table.js";
import { butterflyGardenModel } from "./butterfly-garden.js";
import { giantSeesawModel } from "./giant-seesaw.js";
import { telephoneBoxModel } from "./telephone-box.js";
import { iceCreamVanModel } from "./ice-cream-van.js";
import { steppingStonesModel } from "./stepping-stones.js";
import { flowerClockModel } from "./flower-clock.js";
import { snowflakeLabModel } from "./snowflake-lab.js";
import { iglooModel } from "./igloo.js";
import { penguinColonyModel } from "./penguin-colony.js";
import { polarBearDenModel } from "./polar-bear-den.js";
import { huskySledModel } from "./husky-sled.js";
import { tobogganRunModel } from "./toboggan-run.js";
import { iceSculpturesModel } from "./ice-sculptures.js";
import { snowGlobeModel } from "./snow-globe.js";
import { iceFishingHutModel } from "./ice-fishing-hut.js";
import { frozenWaterfallModel } from "./frozen-waterfall.js";
import { reindeerPaddockModel } from "./reindeer-paddock.js";
import { auroraViewpointModel } from "./aurora-viewpoint.js";
import { skiLiftModel } from "./ski-lift.js";
import { snowFortModel } from "./snow-fort.js";
import { walrusRocksModel } from "./walrus-rocks.js";
import { hotChocolateHutModel } from "./hot-chocolate-hut.js";
import { icicleXylophoneModel } from "./icicle-xylophone.js";
import { arcticFoxDenModel } from "./arctic-fox-den.js";
import { cuckooClockChaletModel } from "./cuckoo-clock-chalet.js";
import { frostFairModel } from "./frost-fair.js";
import { nileFeluccaModel } from "./nile-felucca.js";
import { sphinxModel } from "./sphinx.js";
import { camelCaravanModel } from "./camel-caravan.js";
import { sundialModel } from "./sundial.js";
import { cactusGardenModel } from "./cactus-garden.js";
import { sandboardDuneModel } from "./sandboard-dune.js";
import { meerkatMoundModel } from "./meerkat-mound.js";
import { fossilDigModel } from "./fossil-dig.js";
import { shadufModel } from "./shaduf.js";
import { spiceMarketModel } from "./spice-market.js";
import { magicCarpetModel } from "./magic-carpet.js";
import { scorpionRocksModel } from "./scorpion-rocks.js";
import { tortoisePenModel } from "./tortoise-pen.js";
import { giantSandcastleModel } from "./giant-sandcastle.js";
import { pharaohTombModel } from "./pharaoh-tomb.js";
import { solarFarmModel } from "./solar-farm.js";
import { compassRoseModel } from "./compass-rose.js";
import { ostrichRunModel } from "./ostrich-run.js";
import { sandTimerModel } from "./sand-timer.js";
import { bedouinTentModel } from "./bedouin-tent.js";
import { canopyWalkwayModel } from "./canopy-walkway.js";
import { mangroveBoardwalkModel } from "./mangrove-boardwalk.js";
import { toucanTreeModel } from "./toucan-tree.js";
import { monkeySwingsModel } from "./monkey-swings.js";
import { giantLilyPadsModel } from "./giant-lily-pads.js";
import { mayanTempleModel } from "./mayan-temple.js";
import { orangutanNestModel } from "./orangutan-nest.js";
import { tigerLookoutModel } from "./tiger-lookout.js";
import { hippoWallowModel } from "./hippo-wallow.js";
import { drumCircleModel } from "./drum-circle.js";
import { riverRaftModel } from "./river-raft.js";
import { bananaPlantationModel } from "./banana-plantation.js";
import { crocodileCreekModel } from "./crocodile-creek.js";
import { circuitGardenModel } from "./circuit-garden.js";
import { bambooChimesModel } from "./bamboo-chimes.js";
import { snakeTreeModel } from "./snake-tree.js";
import { leafcutterAntsModel } from "./leafcutter-ants.js";
import { slothHammockModel } from "./sloth-hammock.js";
import { flytrapPatchModel } from "./flytrap-patch.js";
import { parrotPerchModel } from "./parrot-perch.js";
import { geyserModel } from "./geyser.js";
import { lavaTubeCaveModel } from "./lava-tube-cave.js";
import { sleepingDragonModel } from "./sleeping-dragon.js";
import { blacksmithForgeModel } from "./blacksmith-forge.js";
import { vikingLongshipModel } from "./viking-longship.js";
import { vikingLonghouseModel } from "./viking-longhouse.js";
import { crystalGeodeModel } from "./crystal-geode.js";
import { mudPoolsModel } from "./mud-pools.js";
import { seismographModel } from "./seismograph.js";
import { orreryModel } from "./orrery.js";
import { gearMachineModel } from "./gear-machine.js";
import { trebuchetModel } from "./trebuchet.js";
import { phoenixNestModel } from "./phoenix-nest.js";
import { steamEngineModel } from "./steam-engine.js";
import { lavaFountainModel } from "./lava-fountain.js";
import { greekTheatreModel } from "./greek-theatre.js";
import { olympicTorchModel } from "./olympic-torch.js";
import { basaltColumnsModel } from "./basalt-columns.js";
import { pulleyLiftModel } from "./pulley-lift.js";
import { salamanderRocksModel } from "./salamander-rocks.js";
import { observatoryModel } from "./observatory.js";
import { moonPhaseGardenModel } from "./moon-phase-garden.js";
import { satelliteDishModel } from "./satellite-dish.js";
import { ufoLandingModel } from "./ufo-landing.js";
import { meteoriteCraterModel } from "./meteorite-crater.js";
import { lunarRoverModel } from "./lunar-rover.js";
import { constellationGardenModel } from "./constellation-garden.js";
import { gyroscopeTrainerModel } from "./gyroscope-trainer.js";
import { rainbowPrismModel } from "./rainbow-prism.js";
import { periscopeModel } from "./periscope.js";
import { lightningTowerModel } from "./lightning-tower.js";
import { finchAviaryModel } from "./finch-aviary.js";
import { codebreakerHutModel } from "./codebreaker-hut.js";
import { planetTrailModel } from "./planet-trail.js";
import { windTurbinesModel } from "./wind-turbines.js";
import { moonBounceModel } from "./moon-bounce.js";
import { spaceStationFrameModel } from "./space-station-frame.js";
import { alienGardenModel } from "./alien-garden.js";
import { robotWorkshopModel } from "./robot-workshop.js";
import { morseCodeLampModel } from "./morse-code-lamp.js";

export const curiosityModels: Readonly<Record<CuriosityKind, CuriosityModel>> =
  {
    windmill: windmillModel,
    "water-mill": waterMillModel,
    scarecrow: scarecrowModel,
    "wishing-well": wishingWellModel,
    "giant-sunflowers": giantSunflowersModel,
    "frog-pond": frogPondModel,
    maypole: maypoleModel,
    "rabbit-warren": rabbitWarrenModel,
    "haystack-slide": haystackSlideModel,
    "snail-race": snailRaceModel,
    "weather-station": weatherStationModel,
    "picnic-spot": picnicSpotModel,
    "bug-hotel": bugHotelModel,
    "bird-table": birdTableModel,
    "butterfly-garden": butterflyGardenModel,
    "giant-seesaw": giantSeesawModel,
    "telephone-box": telephoneBoxModel,
    "ice-cream-van": iceCreamVanModel,
    "stepping-stones": steppingStonesModel,
    "flower-clock": flowerClockModel,
    "snowflake-lab": snowflakeLabModel,
    igloo: iglooModel,
    "penguin-colony": penguinColonyModel,
    "polar-bear-den": polarBearDenModel,
    "husky-sled": huskySledModel,
    "toboggan-run": tobogganRunModel,
    "ice-sculptures": iceSculpturesModel,
    "snow-globe": snowGlobeModel,
    "ice-fishing-hut": iceFishingHutModel,
    "frozen-waterfall": frozenWaterfallModel,
    "reindeer-paddock": reindeerPaddockModel,
    "aurora-viewpoint": auroraViewpointModel,
    "ski-lift": skiLiftModel,
    "snow-fort": snowFortModel,
    "walrus-rocks": walrusRocksModel,
    "hot-chocolate-hut": hotChocolateHutModel,
    "icicle-xylophone": icicleXylophoneModel,
    "arctic-fox-den": arcticFoxDenModel,
    "cuckoo-clock-chalet": cuckooClockChaletModel,
    "frost-fair": frostFairModel,
    "nile-felucca": nileFeluccaModel,
    sphinx: sphinxModel,
    "camel-caravan": camelCaravanModel,
    sundial: sundialModel,
    "cactus-garden": cactusGardenModel,
    "sandboard-dune": sandboardDuneModel,
    "meerkat-mound": meerkatMoundModel,
    "fossil-dig": fossilDigModel,
    shaduf: shadufModel,
    "spice-market": spiceMarketModel,
    "magic-carpet": magicCarpetModel,
    "scorpion-rocks": scorpionRocksModel,
    "tortoise-pen": tortoisePenModel,
    "giant-sandcastle": giantSandcastleModel,
    "pharaoh-tomb": pharaohTombModel,
    "solar-farm": solarFarmModel,
    "compass-rose": compassRoseModel,
    "ostrich-run": ostrichRunModel,
    "sand-timer": sandTimerModel,
    "bedouin-tent": bedouinTentModel,
    "canopy-walkway": canopyWalkwayModel,
    "mangrove-boardwalk": mangroveBoardwalkModel,
    "toucan-tree": toucanTreeModel,
    "monkey-swings": monkeySwingsModel,
    "giant-lily-pads": giantLilyPadsModel,
    "mayan-temple": mayanTempleModel,
    "orangutan-nest": orangutanNestModel,
    "tiger-lookout": tigerLookoutModel,
    "hippo-wallow": hippoWallowModel,
    "drum-circle": drumCircleModel,
    "river-raft": riverRaftModel,
    "banana-plantation": bananaPlantationModel,
    "crocodile-creek": crocodileCreekModel,
    "circuit-garden": circuitGardenModel,
    "bamboo-chimes": bambooChimesModel,
    "snake-tree": snakeTreeModel,
    "leafcutter-ants": leafcutterAntsModel,
    "sloth-hammock": slothHammockModel,
    "flytrap-patch": flytrapPatchModel,
    "parrot-perch": parrotPerchModel,
    geyser: geyserModel,
    "lava-tube-cave": lavaTubeCaveModel,
    "sleeping-dragon": sleepingDragonModel,
    "blacksmith-forge": blacksmithForgeModel,
    "viking-longship": vikingLongshipModel,
    "viking-longhouse": vikingLonghouseModel,
    "crystal-geode": crystalGeodeModel,
    "mud-pools": mudPoolsModel,
    seismograph: seismographModel,
    orrery: orreryModel,
    "gear-machine": gearMachineModel,
    trebuchet: trebuchetModel,
    "phoenix-nest": phoenixNestModel,
    "steam-engine": steamEngineModel,
    "lava-fountain": lavaFountainModel,
    "greek-theatre": greekTheatreModel,
    "olympic-torch": olympicTorchModel,
    "basalt-columns": basaltColumnsModel,
    "pulley-lift": pulleyLiftModel,
    "salamander-rocks": salamanderRocksModel,
    observatory: observatoryModel,
    "moon-phase-garden": moonPhaseGardenModel,
    "satellite-dish": satelliteDishModel,
    "ufo-landing": ufoLandingModel,
    "meteorite-crater": meteoriteCraterModel,
    "lunar-rover": lunarRoverModel,
    "constellation-garden": constellationGardenModel,
    "gyroscope-trainer": gyroscopeTrainerModel,
    "rainbow-prism": rainbowPrismModel,
    periscope: periscopeModel,
    "lightning-tower": lightningTowerModel,
    "finch-aviary": finchAviaryModel,
    "codebreaker-hut": codebreakerHutModel,
    "planet-trail": planetTrailModel,
    "wind-turbines": windTurbinesModel,
    "moon-bounce": moonBounceModel,
    "space-station-frame": spaceStationFrameModel,
    "alien-garden": alienGardenModel,
    "robot-workshop": robotWorkshopModel,
    "morse-code-lamp": morseCodeLampModel,
  };
