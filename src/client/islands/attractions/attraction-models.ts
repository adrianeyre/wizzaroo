import type { AttractionKind, AttractionModel } from "./attraction-kit.js";
import { playgroundModel } from "./playground.js";
import { adventurePlaygroundModel } from "./adventure-playground.js";
import { skateParkModel } from "./skate-park.js";
import { hedgeMazeModel } from "./hedge-maze.js";
import { bandstandModel } from "./bandstand.js";
import { crazyGolfModel } from "./crazy-golf.js";
import { splashPoolModel } from "./splash-pool.js";
import { seasidePierModel } from "./seaside-pier.js";
import { funfairModel } from "./funfair.js";
import { iceRinkModel } from "./ice-rink.js";
import { villageGreenModel } from "./village-green.js";
import { postOfficeModel } from "./post-office.js";
import { bakeryModel } from "./bakery.js";
import { fireStationModel } from "./fire-station.js";
import { lighthouseModel } from "./lighthouse.js";
import { schoolModel } from "./school.js";
import { libraryModel } from "./library.js";
import { allotmentsModel } from "./allotments.js";
import { farmModel } from "./farm.js";
import { treehouseModel } from "./treehouse.js";
import { campsiteModel } from "./campsite.js";
import { rockPoolsModel } from "./rock-pools.js";
import { hotSpringsModel } from "./hot-springs.js";
import { oasisModel } from "./oasis.js";
import { birdHideModel } from "./bird-hide.js";
import { beehivesModel } from "./beehives.js";
import { castleModel } from "./castle.js";
import { shipwreckModel } from "./shipwreck.js";
import { volcanoLookoutModel } from "./volcano-lookout.js";
import { rocketLaunchPadModel } from "./rocket-launch-pad.js";

export const attractionModels: Readonly<
  Record<AttractionKind, AttractionModel>
> = {
  playground: playgroundModel,
  "adventure-playground": adventurePlaygroundModel,
  "skate-park": skateParkModel,
  "hedge-maze": hedgeMazeModel,
  bandstand: bandstandModel,
  "crazy-golf": crazyGolfModel,
  "splash-pool": splashPoolModel,
  "seaside-pier": seasidePierModel,
  funfair: funfairModel,
  "ice-rink": iceRinkModel,
  "village-green": villageGreenModel,
  "post-office": postOfficeModel,
  bakery: bakeryModel,
  "fire-station": fireStationModel,
  lighthouse: lighthouseModel,
  school: schoolModel,
  library: libraryModel,
  allotments: allotmentsModel,
  farm: farmModel,
  treehouse: treehouseModel,
  campsite: campsiteModel,
  "rock-pools": rockPoolsModel,
  "hot-springs": hotSpringsModel,
  oasis: oasisModel,
  "bird-hide": birdHideModel,
  beehives: beehivesModel,
  castle: castleModel,
  shipwreck: shipwreckModel,
  "volcano-lookout": volcanoLookoutModel,
  "rocket-launch-pad": rocketLaunchPadModel,
};
