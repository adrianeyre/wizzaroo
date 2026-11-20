import type {
  NewLandAttractionKind,
  NewLandAttractionModel,
} from "./new-land-attraction-kit.js";
import { swanBoatLakeModel } from "./swan-boat-lake.js";
import { bouncyCastleModel } from "./bouncy-castle.js";
import { strawberryFieldModel } from "./strawberry-field.js";
import { tractorTrainModel } from "./tractor-train.js";
import { sheepdogTrialsModel } from "./sheepdog-trials.js";
import { villageFeteModel } from "./village-fete.js";
import { ponyStablesModel } from "./pony-stables.js";
import { grassSledgeHillModel } from "./grass-sledge-hill.js";
import { appleOrchardModel } from "./apple-orchard.js";
import { bluebellWoodModel } from "./bluebell-wood.js";
import { puppetTheatreModel } from "./puppet-theatre.js";
import { canalLockModel } from "./canal-lock.js";
import { duckRaceModel } from "./duck-race.js";
import { kiteHillModel } from "./kite-hill.js";
import { cricketPitchModel } from "./cricket-pitch.js";
import { icePalaceModel } from "./ice-palace.js";
import { bobsleighTrackModel } from "./bobsleigh-track.js";
import { skiJumpModel } from "./ski-jump.js";
import { snowballRangeModel } from "./snowball-range.js";
import { glacierBridgeModel } from "./glacier-bridge.js";
import { curlingSheetModel } from "./curling-sheet.js";
import { polarResearchBaseModel } from "./polar-research-base.js";
import { icebreakerShipModel } from "./icebreaker-ship.js";
import { mountainRescueHutModel } from "./mountain-rescue-hut.js";
import { snowmobileTrailModel } from "./snowmobile-trail.js";
import { sealLagoonModel } from "./seal-lagoon.js";
import { snowTubingHillModel } from "./snow-tubing-hill.js";
import { yetiCaveModel } from "./yeti-cave.js";
import { iceClimbingWallModel } from "./ice-climbing-wall.js";
import { mammothMuseumModel } from "./mammoth-museum.js";
import { stoneAgeVillageModel } from "./stone-age-village.js";
import { ironAgeHillfortModel } from "./iron-age-hillfort.js";
import { chariotRacetrackModel } from "./chariot-racetrack.js";
import { desertFortModel } from "./desert-fort.js";
import { sandYachtsModel } from "./sand-yachts.js";
import { duneBuggyTrackModel } from "./dune-buggy-track.js";
import { datePalmGroveModel } from "./date-palm-grove.js";
import { papyrusWorkshopModel } from "./papyrus-workshop.js";
import { sandstoneArchesModel } from "./sandstone-arches.js";
import { dinosaurParkModel } from "./dinosaur-park.js";
import { archimedesScrewModel } from "./archimedes-screw.js";
import { potteryKilnModel } from "./pottery-kiln.js";
import { sandSlideTowerModel } from "./sand-slide-tower.js";
import { windcatcherHouseModel } from "./windcatcher-house.js";
import { paintedCaveModel } from "./painted-cave.js";
import { vineSwingGladeModel } from "./vine-swing-glade.js";
import { stranglerFigRuinsModel } from "./strangler-fig-ruins.js";
import { rainforestBiomeModel } from "./rainforest-biome.js";
import { stiltVillageModel } from "./stilt-village.js";
import { cacaoFarmModel } from "./cacao-farm.js";
import { gorillaSanctuaryModel } from "./gorilla-sanctuary.js";
import { elephantPoolModel } from "./elephant-pool.js";
import { jungleCoasterModel } from "./jungle-coaster.js";
import { batCaveModel } from "./bat-cave.js";
import { hummingbirdGardenModel } from "./hummingbird-garden.js";
import { hydroPowerHouseModel } from "./hydro-power-house.js";
import { giantKapokClimbModel } from "./giant-kapok-climb.js";
import { orchidHouseModel } from "./orchid-house.js";
import { highRopesCourseModel } from "./high-ropes-course.js";
import { insectHouseModel } from "./insect-house.js";
import { volcanoMuseumModel } from "./volcano-museum.js";
import { dragonBoatLakeModel } from "./dragon-boat-lake.js";
import { minotaurLabyrinthModel } from "./minotaur-labyrinth.js";
import { greekTempleModel } from "./greek-temple.js";
import { suttonHooMoundModel } from "./sutton-hoo-mound.js";
import { glassblowingStudioModel } from "./glassblowing-studio.js";
import { geothermalPlantModel } from "./geothermal-plant.js";
import { mineCartRideModel } from "./mine-cart-ride.js";
import { chilliFarmModel } from "./chilli-farm.js";
import { pompeiiStreetModel } from "./pompeii-street.js";
import { bronzeColossusModel } from "./bronze-colossus.js";
import { fireworkTowerModel } from "./firework-tower.js";
import { lavaFlumeModel } from "./lava-flume.js";
import { obsidianQuarryModel } from "./obsidian-quarry.js";
import { dragonHatcheryModel } from "./dragon-hatchery.js";
import { planetariumDomeModel } from "./planetarium-dome.js";
import { marsBaseModel } from "./mars-base.js";
import { dropTowerModel } from "./drop-tower.js";
import { spaceShuttleModel } from "./space-shuttle.js";
import { starFlyerModel } from "./star-flyer.js";
import { mirrorMazeModel } from "./mirror-maze.js";
import { cameraObscuraModel } from "./camera-obscura.js";
import { astronautCentrifugeModel } from "./astronaut-centrifuge.js";
import { beagleShipModel } from "./beagle-ship.js";
import { giantHeartModel } from "./giant-heart.js";
import { homeFrontHouseModel } from "./home-front-house.js";
import { lunarLanderModel } from "./lunar-lander.js";
import { blackHoleSlideModel } from "./black-hole-slide.js";
import { shadowGardenModel } from "./shadow-garden.js";
import { inventorsHallModel } from "./inventors-hall.js";

export const newLandAttractionModels: Readonly<
  Record<NewLandAttractionKind, NewLandAttractionModel>
> = {
  "swan-boat-lake": swanBoatLakeModel,
  "bouncy-castle": bouncyCastleModel,
  "strawberry-field": strawberryFieldModel,
  "tractor-train": tractorTrainModel,
  "sheepdog-trials": sheepdogTrialsModel,
  "village-fete": villageFeteModel,
  "pony-stables": ponyStablesModel,
  "grass-sledge-hill": grassSledgeHillModel,
  "apple-orchard": appleOrchardModel,
  "bluebell-wood": bluebellWoodModel,
  "puppet-theatre": puppetTheatreModel,
  "canal-lock": canalLockModel,
  "duck-race": duckRaceModel,
  "kite-hill": kiteHillModel,
  "cricket-pitch": cricketPitchModel,
  "ice-palace": icePalaceModel,
  "bobsleigh-track": bobsleighTrackModel,
  "ski-jump": skiJumpModel,
  "snowball-range": snowballRangeModel,
  "glacier-bridge": glacierBridgeModel,
  "curling-sheet": curlingSheetModel,
  "polar-research-base": polarResearchBaseModel,
  "icebreaker-ship": icebreakerShipModel,
  "mountain-rescue-hut": mountainRescueHutModel,
  "snowmobile-trail": snowmobileTrailModel,
  "seal-lagoon": sealLagoonModel,
  "snow-tubing-hill": snowTubingHillModel,
  "yeti-cave": yetiCaveModel,
  "ice-climbing-wall": iceClimbingWallModel,
  "mammoth-museum": mammothMuseumModel,
  "stone-age-village": stoneAgeVillageModel,
  "iron-age-hillfort": ironAgeHillfortModel,
  "chariot-racetrack": chariotRacetrackModel,
  "desert-fort": desertFortModel,
  "sand-yachts": sandYachtsModel,
  "dune-buggy-track": duneBuggyTrackModel,
  "date-palm-grove": datePalmGroveModel,
  "papyrus-workshop": papyrusWorkshopModel,
  "sandstone-arches": sandstoneArchesModel,
  "dinosaur-park": dinosaurParkModel,
  "archimedes-screw": archimedesScrewModel,
  "pottery-kiln": potteryKilnModel,
  "sand-slide-tower": sandSlideTowerModel,
  "windcatcher-house": windcatcherHouseModel,
  "painted-cave": paintedCaveModel,
  "vine-swing-glade": vineSwingGladeModel,
  "strangler-fig-ruins": stranglerFigRuinsModel,
  "rainforest-biome": rainforestBiomeModel,
  "stilt-village": stiltVillageModel,
  "cacao-farm": cacaoFarmModel,
  "gorilla-sanctuary": gorillaSanctuaryModel,
  "elephant-pool": elephantPoolModel,
  "jungle-coaster": jungleCoasterModel,
  "bat-cave": batCaveModel,
  "hummingbird-garden": hummingbirdGardenModel,
  "hydro-power-house": hydroPowerHouseModel,
  "giant-kapok-climb": giantKapokClimbModel,
  "orchid-house": orchidHouseModel,
  "high-ropes-course": highRopesCourseModel,
  "insect-house": insectHouseModel,
  "volcano-museum": volcanoMuseumModel,
  "dragon-boat-lake": dragonBoatLakeModel,
  "minotaur-labyrinth": minotaurLabyrinthModel,
  "greek-temple": greekTempleModel,
  "sutton-hoo-mound": suttonHooMoundModel,
  "glassblowing-studio": glassblowingStudioModel,
  "geothermal-plant": geothermalPlantModel,
  "mine-cart-ride": mineCartRideModel,
  "chilli-farm": chilliFarmModel,
  "pompeii-street": pompeiiStreetModel,
  "bronze-colossus": bronzeColossusModel,
  "firework-tower": fireworkTowerModel,
  "lava-flume": lavaFlumeModel,
  "obsidian-quarry": obsidianQuarryModel,
  "dragon-hatchery": dragonHatcheryModel,
  "planetarium-dome": planetariumDomeModel,
  "mars-base": marsBaseModel,
  "drop-tower": dropTowerModel,
  "space-shuttle": spaceShuttleModel,
  "star-flyer": starFlyerModel,
  "mirror-maze": mirrorMazeModel,
  "camera-obscura": cameraObscuraModel,
  "astronaut-centrifuge": astronautCentrifugeModel,
  "beagle-ship": beagleShipModel,
  "giant-heart": giantHeartModel,
  "home-front-house": homeFrontHouseModel,
  "lunar-lander": lunarLanderModel,
  "black-hole-slide": blackHoleSlideModel,
  "shadow-garden": shadowGardenModel,
  "inventors-hall": inventorsHallModel,
};
