import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import englishAOrAn from "./english.a-or-an.json" with { type: "json" };
import englishAdverbialsOfTimeAndNumber from "./english.adverbials-of-time-and-number.json" with { type: "json" };
import englishAlphabetOrder from "./english.alphabet-order.json" with { type: "json" };
import englishAlphabeticalOrderFirstFourLetters from "./english.alphabetical-order-first-four-letters.json" with { type: "json" };
import englishAlphabeticalOrderFirstThreeLetters from "./english.alphabetical-order-first-three-letters.json" with { type: "json" };
import englishAlphabeticalOrderFirstTwoLetters from "./english.alphabetical-order-first-two-letters.json" with { type: "json" };
import englishCapitalLettersForNames from "./english.capital-letters-for-names.json" with { type: "json" };
import englishColonsSemiColonsAndHyphens from "./english.colons-semi-colons-and-hyphens.json" with { type: "json" };
import englishComparativesAndSuperlativesErEst from "./english.comparatives-and-superlatives-er-est.json" with { type: "json" };
import englishCompoundWords from "./english.compound-words.json" with { type: "json" };
import englishConjunctions from "./english.conjunctions.json" with { type: "json" };
import englishContractions from "./english.contractions.json" with { type: "json" };
import englishDeterminersAndPronouns from "./english.determiners-and-pronouns.json" with { type: "json" };
import englishFormalExpandedContractions from "./english.formal-expanded-contractions.json" with { type: "json" };
import englishFormalVocabulary from "./english.formal-vocabulary.json" with { type: "json" };
import englishFrontedAdverbialCommasAndSpeech from "./english.fronted-adverbial-commas-and-speech.json" with { type: "json" };
import englishGreekAndLatinRoots from "./english.greek-and-latin-roots.json" with { type: "json" };
import englishHomophones from "./english.homophones.json" with { type: "json" };
import englishHomophonesAcceptToMail from "./english.homophones-accept-to-mail.json" with { type: "json" };
import englishHomophonesAdviceToGuessed from "./english.homophones-advice-to-guessed.json" with { type: "json" };
import englishHomophonesHeardToWary from "./english.homophones-heard-to-wary.json" with { type: "json" };
import englishHomophonesMainToWhose from "./english.homophones-main-to-whose.json" with { type: "json" };
import englishHyphensAfterPrefixes from "./english.hyphens-after-prefixes.json" with { type: "json" };
import englishInvertedCommasForSpeech from "./english.inverted-commas-for-speech.json" with { type: "json" };
import englishIrregularPluralPossessives from "./english.irregular-plural-possessives.json" with { type: "json" };
import englishJoiningWithAnd from "./english.joining-with-and.json" with { type: "json" };
import englishLinkingAdverbials from "./english.linking-adverbials.json" with { type: "json" };
import englishListCommasAndSentenceTypes from "./english.list-commas-and-sentence-types.json" with { type: "json" };
import englishModalVerbContractions from "./english.modal-verb-contractions.json" with { type: "json" };
import englishModalVerbsAndRelativePronouns from "./english.modal-verbs-and-relative-pronouns.json" with { type: "json" };
import englishNounsVerbsAdjectivesAdverbs from "./english.nouns-verbs-adjectives-adverbs.json" with { type: "json" };
import englishParenthesisAndClarifyingCommas from "./english.parenthesis-and-clarifying-commas.json" with { type: "json" };
import englishPluralPossessiveApostrophes from "./english.plural-possessive-apostrophes.json" with { type: "json" };
import englishPluralsSEs from "./english.plurals-s-es.json" with { type: "json" };
import englishPluralsYToIes from "./english.plurals-y-to-ies.json" with { type: "json" };
import englishPrefixUn from "./english.prefix-un.json" with { type: "json" };
import englishPrefixesDisMisReSubSuperAntiAuto from "./english.prefixes-dis-mis-re-sub-super-anti-auto.json" with { type: "json" };
import englishPrefixesInIlImIrInter from "./english.prefixes-in-il-im-ir-inter.json" with { type: "json" };
import englishPrepositionsAndConjunctions from "./english.prepositions-and-conjunctions.json" with { type: "json" };
import englishRelativeClauses from "./english.relative-clauses.json" with { type: "json" };
import englishRhymesWithDifferentSpellings from "./english.rhymes-with-different-spellings.json" with { type: "json" };
import englishRhymingWords from "./english.rhyming-words.json" with { type: "json" };
import englishSentencePunctuation from "./english.sentence-punctuation.json" with { type: "json" };
import englishSpellingFfLlSsZzCkNkTch from "./english.spelling-ff-ll-ss-zz-ck-nk-tch.json" with { type: "json" };
import englishStandardEnglishVerbForms from "./english.standard-english-verb-forms.json" with { type: "json" };
import englishSubjectAndObject from "./english.subject-and-object.json" with { type: "json" };
import englishSubjectVerbAgreement from "./english.subject-verb-agreement.json" with { type: "json" };
import englishSubjunctiveAndFormalVerbs from "./english.subjunctive-and-formal-verbs.json" with { type: "json" };
import englishSubordinatingConjunctions from "./english.subordinating-conjunctions.json" with { type: "json" };
import englishSuffixSpellingRules from "./english.suffix-spelling-rules.json" with { type: "json" };
import englishSuffixesAbleIbleCiousCial from "./english.suffixes-able-ible-cious-cial.json" with { type: "json" };
import englishSuffixesFerAntAnceEntEnce from "./english.suffixes-fer-ant-ance-ent-ence.json" with { type: "json" };
import englishSuffixesFulLessNessLy from "./english.suffixes-ful-less-ness-ly.json" with { type: "json" };
import englishSuffixesIngEdErEst from "./english.suffixes-ing-ed-er-est.json" with { type: "json" };
import englishSuffixesLyAtionAndDoubling from "./english.suffixes-ly-ation-and-doubling.json" with { type: "json" };
import englishSuffixesOusTionSionCian from "./english.suffixes-ous-tion-sion-cian.json" with { type: "json" };
import englishSynonymNouns from "./english.synonym-nouns.json" with { type: "json" };
import englishTimeAndCauseConjunctions from "./english.time-and-cause-conjunctions.json" with { type: "json" };
import englishVerbSuffixesAteIseIfyEn from "./english.verb-suffixes-ate-ise-ify-en.json" with { type: "json" };
import englishWordFamilies from "./english.word-families.json" with { type: "json" };
import englishUnderstandingWhatIRead from "./english.understanding-what-i-read.json" with { type: "json" };
import englishQuestionsAboutAText from "./english.questions-about-a-text.json" with { type: "json" };
import englishInferenceAndPrediction from "./english.inference-and-prediction.json" with { type: "json" };
import englishMainIdeasAndThemes from "./english.main-ideas-and-themes.json" with { type: "json" };
import englishInferenceWithEvidence from "./english.inference-with-evidence.json" with { type: "json" };
import englishSummarisingAndComparingTexts from "./english.summarising-and-comparing-texts.json" with { type: "json" };
import englishSequencingSentences from "./english.sequencing-sentences.json" with { type: "json" };
import englishPlanningANarrative from "./english.planning-a-narrative.json" with { type: "json" };
import englishParagraphsAndHeadings from "./english.paragraphs-and-headings.json" with { type: "json" };
import englishSettingsCharactersAndPlot from "./english.settings-characters-and-plot.json" with { type: "json" };
import englishWritingForAudienceAndPurpose from "./english.writing-for-audience-and-purpose.json" with { type: "json" };
import englishCohesionAcrossParagraphs from "./english.cohesion-across-paragraphs.json" with { type: "json" };
import capitalLetters from "./english.capital-letters.json" with { type: "json" };
import computingSingleStepInstructions from "./computing.single-step-instructions.json" with { type: "json" };
import computingNameTechnology from "./computing.name-technology.json" with { type: "json" };
import computingDigitalPainting from "./computing.digital-painting.json" with { type: "json" };
import computingGroupObjects from "./computing.group-objects.json" with { type: "json" };
import computingEverydayAlgorithms from "./computing.everyday-algorithms.json" with { type: "json" };
import computingDebugARoute from "./computing.debug-a-route.json" with { type: "json" };
import computingPredictARoute from "./computing.predict-a-route.json" with { type: "json" };
import computingAskForHelpOnline from "./computing.ask-for-help-online.json" with { type: "json" };
import computingKeyboardKeys from "./computing.keyboard-keys.json" with { type: "json" };
import computingAnimationPrograms from "./computing.animation-programs.json" with { type: "json" };
import computingTechnologyBeyondSchool from "./computing.technology-beyond-school.json" with { type: "json" };
import computingTakingPhotos from "./computing.taking-photos.json" with { type: "json" };
import computingPlanARoute from "./computing.plan-a-route.json" with { type: "json" };
import computingPictograms from "./computing.pictograms.json" with { type: "json" };
import computingDigitalMusic from "./computing.digital-music.json" with { type: "json" };
import computingProgramAQuiz from "./computing.program-a-quiz.json" with { type: "json" };
import computingDebugAnAlgorithm from "./computing.debug-an-algorithm.json" with { type: "json" };
import computingPredictLongerPrograms from "./computing.predict-longer-programs.json" with { type: "json" };
import computingKeepInformationPrivate from "./computing.keep-information-private.json" with { type: "json" };
import computingBeKindOnline from "./computing.be-kind-online.json" with { type: "json" };
import computingConnectComputers from "./computing.connect-computers.json" with { type: "json" };
import computingStopFrameAnimation from "./computing.stop-frame-animation.json" with { type: "json" };
import computingSequenceSounds from "./computing.sequence-sounds.json" with { type: "json" };
import computingBranchingDatabases from "./computing.branching-databases.json" with { type: "json" };
import computingDesktopPublishing from "./computing.desktop-publishing.json" with { type: "json" };
import computingEventsAndActions from "./computing.events-and-actions.json" with { type: "json" };
import computingDecomposeATask from "./computing.decompose-a-task.json" with { type: "json" };
import computingDebugASequence from "./computing.debug-a-sequence.json" with { type: "json" };
import computingStrongPasswords from "./computing.strong-passwords.json" with { type: "json" };
import computingInputsAndOutputs from "./computing.inputs-and-outputs.json" with { type: "json" };
import computingHowTheInternetWorks from "./computing.how-the-internet-works.json" with { type: "json" };
import computingWorldWideWeb from "./computing.world-wide-web.json" with { type: "json" };
import computingAudioEditing from "./computing.audio-editing.json" with { type: "json" };
import computingRepetitionInShapes from "./computing.repetition-in-shapes.json" with { type: "json" };
import computingRepetitionInGames from "./computing.repetition-in-games.json" with { type: "json" };
import computingDataLogging from "./computing.data-logging.json" with { type: "json" };
import computingPhotoEditing from "./computing.photo-editing.json" with { type: "json" };
import computingDebugLoops from "./computing.debug-loops.json" with { type: "json" };
import computingReliableInformation from "./computing.reliable-information.json" with { type: "json" };
import computingDigitalFootprint from "./computing.digital-footprint.json" with { type: "json" };
import computingOnlineCollaboration from "./computing.online-collaboration.json" with { type: "json" };
import computingVideoProduction from "./computing.video-production.json" with { type: "json" };
import computingSelectionPhysicalComputing from "./computing.selection-physical-computing.json" with { type: "json" };
import computingFlatFileDatabases from "./computing.flat-file-databases.json" with { type: "json" };
import computingVectorDrawing from "./computing.vector-drawing.json" with { type: "json" };
import computingSelectionInQuizzes from "./computing.selection-in-quizzes.json" with { type: "json" };
import computingExplainAlgorithms from "./computing.explain-algorithms.json" with { type: "json" };
import computingSearchRanking from "./computing.search-ranking.json" with { type: "json" };
import computingChooseSensors from "./computing.choose-sensors.json" with { type: "json" };
import computingReportConcerns from "./computing.report-concerns.json" with { type: "json" };
import computingEffectiveSearching from "./computing.effective-searching.json" with { type: "json" };
import computingWebpageCreation from "./computing.webpage-creation.json" with { type: "json" };
import computingVariablesInGames from "./computing.variables-in-games.json" with { type: "json" };
import computingSpreadsheets from "./computing.spreadsheets.json" with { type: "json" };
import computing3dModelling from "./computing.3d-modelling.json" with { type: "json" };
import computingSensingMovement from "./computing.sensing-movement.json" with { type: "json" };
import computingDesignAGame from "./computing.design-a-game.json" with { type: "json" };
import computingDebugWithVariables from "./computing.debug-with-variables.json" with { type: "json" };
import computingInternetCommunication from "./computing.internet-communication.json" with { type: "json" };
import computingResponsibleSharing from "./computing.responsible-sharing.json" with { type: "json" };
import commonExceptionWords from "./english.common-exception-words.json" with { type: "json" };
import moreCommonExceptionWords from "./english.more-common-exception-words.json" with { type: "json" };
import wordListLowerKeyStage2 from "./english.word-list-lower-key-stage-2.json" with { type: "json" };
import wordListUpperKeyStage2 from "./english.word-list-upper-key-stage-2.json" with { type: "json" };
import addSubtractFactsTo20 from "./maths.add-subtract-facts-to-20.json" with { type: "json" };
import equivalentFractions from "./maths.equivalent-fractions.json" with { type: "json" };
import fractionsAsDecimalEquivalents from "./maths.fractions-as-decimal-equivalents.json" with { type: "json" };
import fractionsAsDecimals from "./maths.fractions-as-decimals.json" with { type: "json" };
import fractionsDecimalsPercentages from "./maths.fractions-decimals-percentages.json" with { type: "json" };
import fractionsOfShapes from "./maths.fractions-of-shapes.json" with { type: "json" };
import multiplyDivideBy101001000 from "./maths.multiply-divide-by-10-100-1000.json" with { type: "json" };
import orderOfOperations from "./maths.order-of-operations.json" with { type: "json" };
import timesTables348 from "./maths.times-tables-3-4-8.json" with { type: "json" };
import timesTablesTo12 from "./maths.times-tables-to-12.json" with { type: "json" };
import countObjectsTo20 from "./maths.count-objects-to-20.json" with { type: "json" };
import name3dShapes from "./maths.name-3d-shapes.json" with { type: "json" };
import { buildGeographySkillFiles, geographyGames } from "./geography-games.js";
import musicLoudAndQuiet from "./music.loud-and-quiet.json" with { type: "json" };
import musicFastAndSlow from "./music.fast-and-slow.json" with { type: "json" };
import musicHighAndLow from "./music.high-and-low.json" with { type: "json" };
import musicSteadyBeat from "./music.steady-beat.json" with { type: "json" };
import musicBodyPercussionPatterns from "./music.body-percussion-patterns.json" with { type: "json" };
import musicUntunedPercussion from "./music.untuned-percussion.json" with { type: "json" };
import musicMusicDescribesAnimals from "./music.music-describes-animals.json" with { type: "json" };
import musicLongAndShort from "./music.long-and-short.json" with { type: "json" };
import musicSameOrDifferent from "./music.same-or-different.json" with { type: "json" };
import musicMelodyDirection from "./music.melody-direction.json" with { type: "json" };
import musicChantsAndRhymes from "./music.chants-and-rhymes.json" with { type: "json" };
import musicCrotchetsAndQuavers from "./music.crotchets-and-quavers.json" with { type: "json" };
import musicGettingLouderAndQuieter from "./music.getting-louder-and-quieter.json" with { type: "json" };
import musicGettingFasterAndSlower from "./music.getting-faster-and-slower.json" with { type: "json" };
import musicStepsAndLeaps from "./music.steps-and-leaps.json" with { type: "json" };
import musicTunedPercussion from "./music.tuned-percussion.json" with { type: "json" };
import musicHearingRests from "./music.hearing-rests.json" with { type: "json" };
import musicTunedInstruments from "./music.tuned-instruments.json" with { type: "json" };
import musicMusicAndMood from "./music.music-and-mood.json" with { type: "json" };
import musicDotNotation from "./music.dot-notation.json" with { type: "json" };
import musicFinishedOrNot from "./music.finished-or-not.json" with { type: "json" };
import musicBeatsInABar from "./music.beats-in-a-bar.json" with { type: "json" };
import musicNoteValues from "./music.note-values.json" with { type: "json" };
import musicForteAndPiano from "./music.forte-and-piano.json" with { type: "json" };
import musicTempoWords from "./music.tempo-words.json" with { type: "json" };
import musicOstinato from "./music.ostinato.json" with { type: "json" };
import musicNotesOnTheStave from "./music.notes-on-the-stave.json" with { type: "json" };
import musicLayersOfSound from "./music.layers-of-sound.json" with { type: "json" };
import musicInstrumentFamilies from "./music.instrument-families.json" with { type: "json" };
import musicCompleteTheBar from "./music.complete-the-bar.json" with { type: "json" };
import musicDoReMi from "./music.do-re-mi.json" with { type: "json" };
import musicRhythmDictation from "./music.rhythm-dictation.json" with { type: "json" };
import musicMajorAndMinor from "./music.major-and-minor.json" with { type: "json" };
import musicKeyboardLetterNames from "./music.keyboard-letter-names.json" with { type: "json" };
import musicCrescendoAndDiminuendo from "./music.crescendo-and-diminuendo.json" with { type: "json" };
import musicBinaryAndTernary from "./music.binary-and-ternary.json" with { type: "json" };
import musicTimeSignatures from "./music.time-signatures.json" with { type: "json" };
import musicChordsAndSingleNotes from "./music.chords-and-single-notes.json" with { type: "json" };
import musicOrchestralInstruments from "./music.orchestral-instruments.json" with { type: "json" };
import musicUnisonHarmonyAndRounds from "./music.unison-harmony-and-rounds.json" with { type: "json" };
import musicHowInstrumentsMakeSound from "./music.how-instruments-make-sound.json" with { type: "json" };
import musicDottedRhythms from "./music.dotted-rhythms.json" with { type: "json" };
import musicChordsOneFourFive from "./music.chords-one-four-five.json" with { type: "json" };
import musicIntervals from "./music.intervals.json" with { type: "json" };
import musicTrebleClefNotes from "./music.treble-clef-notes.json" with { type: "json" };
import musicSharpsAndFlats from "./music.sharps-and-flats.json" with { type: "json" };
import musicBaroqueAndClassicalComposers from "./music.baroque-and-classical-composers.json" with { type: "json" };
import musicSyncopation from "./music.syncopation.json" with { type: "json" };
import musicScales from "./music.scales.json" with { type: "json" };
import musicAddingNoteValues from "./music.adding-note-values.json" with { type: "json" };
import musicRondoForm from "./music.rondo-form.json" with { type: "json" };
import musicPeriodsOfMusic from "./music.periods-of-music.json" with { type: "json" };
import musicRomanticComposers from "./music.romantic-composers.json" with { type: "json" };
import musicBassClefNotes from "./music.bass-clef-notes.json" with { type: "json" };
import musicArticulation from "./music.articulation.json" with { type: "json" };
import musicTriads from "./music.triads.json" with { type: "json" };
import musicKeySignatures from "./music.key-signatures.json" with { type: "json" };
import musicMusicForFilm from "./music.music-for-film.json" with { type: "json" };
import musicTripletsAndSyncopation from "./music.triplets-and-syncopation.json" with { type: "json" };
import musicMelodyDictation from "./music.melody-dictation.json" with { type: "json" };
import musicConductingPatterns from "./music.conducting-patterns.json" with { type: "json" };
import numberBonds10 from "./maths.number-bonds-10.json" with { type: "json" };
import oneMoreOneLess from "./maths.one-more-one-less.json" with { type: "json" };
import addWithin20 from "./maths.add-within-20.json" with { type: "json" };
import subtractWithin20 from "./maths.subtract-within-20.json" with { type: "json" };
import countInSteps from "./maths.count-in-steps.json" with { type: "json" };
import compareHeights from "./maths.compare-heights.json" with { type: "json" };
import halvesAndQuarters from "./maths.halves-and-quarters.json" with { type: "json" };
import tellTheTime from "./maths.tell-the-time.json" with { type: "json" };
import tensAndOnes from "./maths.tens-and-ones.json" with { type: "json" };
import tenMoreTenLess from "./maths.ten-more-ten-less.json" with { type: "json" };
import shapeProperties from "./maths.shape-properties.json" with { type: "json" };
import addTwoDigit from "./maths.add-two-digit.json" with { type: "json" };
import subtractTwoDigit from "./maths.subtract-two-digit.json" with { type: "json" };
import countInThreesAndTens from "./maths.count-in-threes-and-tens.json" with { type: "json" };
import measureInCentimetres from "./maths.measure-in-centimetres.json" with { type: "json" };
import timeToFiveMinutes from "./maths.time-to-five-minutes.json" with { type: "json" };
import familiesOfEquivalentFractions from "./maths.families-of-equivalent-fractions.json" with { type: "json" };
import squaresCubesAndPowersOfTen from "./maths.squares-cubes-and-powers-of-ten.json" with { type: "json" };
import hundredsTensAndOnes from "./maths.hundreds-tens-and-ones.json" with { type: "json" };
import thousandsHundredsTensAndOnes from "./maths.thousands-hundreds-tens-and-ones.json" with { type: "json" };
import decimalPlaceValue from "./maths.decimal-place-value.json" with { type: "json" };
import numbersToTenMillion from "./maths.numbers-to-ten-million.json" with { type: "json" };
import tenOrHundredMoreOrLess from "./maths.ten-or-hundred-more-or-less.json" with { type: "json" };
import thousandMoreOrLess from "./maths.thousand-more-or-less.json" with { type: "json" };
import powersOfTenMoreOrLess from "./maths.powers-of-ten-more-or-less.json" with { type: "json" };
import negativeNumbers from "./maths.negative-numbers.json" with { type: "json" };
import rightAnglesAndSides from "./maths.right-angles-and-sides.json" with { type: "json" };
import classifyTrianglesAndQuadrilaterals from "./maths.classify-triangles-and-quadrilaterals.json" with { type: "json" };
import regularAndIrregularPolygons from "./maths.regular-and-irregular-polygons.json" with { type: "json" };
import netsOf3dShapes from "./maths.nets-of-3d-shapes.json" with { type: "json" };
import addThreeDigit from "./maths.add-three-digit.json" with { type: "json" };
import addFourDigit from "./maths.add-four-digit.json" with { type: "json" };
import addDecimals from "./maths.add-decimals.json" with { type: "json" };
import addLargeNumbers from "./maths.add-large-numbers.json" with { type: "json" };
import subtractThreeDigit from "./maths.subtract-three-digit.json" with { type: "json" };
import subtractFourDigit from "./maths.subtract-four-digit.json" with { type: "json" };
import subtractDecimals from "./maths.subtract-decimals.json" with { type: "json" };
import subtractLargeNumbers from "./maths.subtract-large-numbers.json" with { type: "json" };
import countInFoursEightsAndFifties from "./maths.count-in-fours-eights-and-fifties.json" with { type: "json" };
import countInSixesSevensAndTwentyFives from "./maths.count-in-sixes-sevens-and-twenty-fives.json" with { type: "json" };
import countInPowersOfTenAndTenths from "./maths.count-in-powers-of-ten-and-tenths.json" with { type: "json" };
import linearSequences from "./maths.linear-sequences.json" with { type: "json" };
import measureInMillimetres from "./maths.measure-in-millimetres.json" with { type: "json" };
import perimeterOfRectangles from "./maths.perimeter-of-rectangles.json" with { type: "json" };
import areaOfRectangles from "./maths.area-of-rectangles.json" with { type: "json" };
import volumeOfCuboids from "./maths.volume-of-cuboids.json" with { type: "json" };
import unitAndNonUnitFractions from "./maths.unit-and-non-unit-fractions.json" with { type: "json" };
import timeToTheMinute from "./maths.time-to-the-minute.json" with { type: "json" };
import twentyFourHourClock from "./maths.twenty-four-hour-clock.json" with { type: "json" };
import laterTimes from "./maths.later-times.json" with { type: "json" };
import durations from "./maths.durations.json" with { type: "json" };
import multiplyAndDivideWithObjects from "./maths.multiply-and-divide-with-objects.json" with { type: "json" };
import timesTables2510 from "./maths.times-tables-2-5-10.json" with { type: "json" };
import ratioAndScale from "./maths.ratio-and-scale.json" with { type: "json" };
import positionAndTurns from "./maths.position-and-turns.json" with { type: "json" };
import clockwiseTurns from "./maths.clockwise-turns.json" with { type: "json" };
import coordinatesFirstQuadrant from "./maths.coordinates-first-quadrant.json" with { type: "json" };
import reflectionAndTranslation from "./maths.reflection-and-translation.json" with { type: "json" };
import coordinatesFourQuadrants from "./maths.coordinates-four-quadrants.json" with { type: "json" };
import tallyChartsAndPictograms from "./maths.tally-charts-and-pictograms.json" with { type: "json" };
import barChartsAndTables from "./maths.bar-charts-and-tables.json" with { type: "json" };
import lineGraphs from "./maths.line-graphs.json" with { type: "json" };
import tablesAndTimetables from "./maths.tables-and-timetables.json" with { type: "json" };
import pieChartsAndMean from "./maths.pie-charts-and-mean.json" with { type: "json" };
import multiplyLargeNumbers from "./maths.multiply-large-numbers.json" with { type: "json" };
import divideLargeNumbers from "./maths.divide-large-numbers.json" with { type: "json" };
import addSubtractFractions from "./maths.add-subtract-fractions.json" with { type: "json" };
import multiplyDivideFractions from "./maths.multiply-divide-fractions.json" with { type: "json" };
import percentagesOfAmounts from "./maths.percentages-of-amounts.json" with { type: "json" };
import simpleFormulae from "./maths.simple-formulae.json" with { type: "json" };
import meanAndTables from "./maths.mean-and-tables.json" with { type: "json" };
import missingAngles from "./maths.missing-angles.json" with { type: "json" };
import convertUnits from "./maths.convert-units.json" with { type: "json" };
import englishVerbTenses from "./english.verb-tenses.json" with { type: "json" };
import englishActiveAndPassiveVoice from "./english.active-and-passive-voice.json" with { type: "json" };
import englishReadingRetrieval from "./english.reading-retrieval.json" with { type: "json" };
import englishReadingInference from "./english.reading-inference.json" with { type: "json" };
import englishReadingVocabulary from "./english.reading-vocabulary.json" with { type: "json" };
import englishReadingSummarisingAndSequencing from "./english.reading-summarising-and-sequencing.json" with { type: "json" };
import soundB from "./phonics.sound-b.json" with { type: "json" };
import soundCh from "./phonics.sound-ch.json" with { type: "json" };
import soundD from "./phonics.sound-d.json" with { type: "json" };
import soundF from "./phonics.sound-f.json" with { type: "json" };
import soundG from "./phonics.sound-g.json" with { type: "json" };
import soundH from "./phonics.sound-h.json" with { type: "json" };
import soundJ from "./phonics.sound-j.json" with { type: "json" };
import soundK from "./phonics.sound-k.json" with { type: "json" };
import soundL from "./phonics.sound-l.json" with { type: "json" };
import soundM from "./phonics.sound-m.json" with { type: "json" };
import soundN from "./phonics.sound-n.json" with { type: "json" };
import soundNg from "./phonics.sound-ng.json" with { type: "json" };
import soundP from "./phonics.sound-p.json" with { type: "json" };
import soundR from "./phonics.sound-r.json" with { type: "json" };
import soundS from "./phonics.sound-s.json" with { type: "json" };
import soundSh from "./phonics.sound-sh.json" with { type: "json" };
import soundT from "./phonics.sound-t.json" with { type: "json" };
import soundThUnvoiced from "./phonics.sound-th-unvoiced.json" with { type: "json" };
import soundThVoiced from "./phonics.sound-th-voiced.json" with { type: "json" };
import soundV from "./phonics.sound-v.json" with { type: "json" };
import soundW from "./phonics.sound-w.json" with { type: "json" };
import soundY from "./phonics.sound-y.json" with { type: "json" };
import soundZ from "./phonics.sound-z.json" with { type: "json" };
import soundZh from "./phonics.sound-zh.json" with { type: "json" };
import soundA from "./phonics.sound-a.json" with { type: "json" };
import soundE from "./phonics.sound-e.json" with { type: "json" };
import soundI from "./phonics.sound-i.json" with { type: "json" };
import soundO from "./phonics.sound-o.json" with { type: "json" };
import soundU from "./phonics.sound-u.json" with { type: "json" };
import soundAi from "./phonics.sound-ai.json" with { type: "json" };
import soundEe from "./phonics.sound-ee.json" with { type: "json" };
import soundIgh from "./phonics.sound-igh.json" with { type: "json" };
import soundOa from "./phonics.sound-oa.json" with { type: "json" };
import soundOoLong from "./phonics.sound-oo-long.json" with { type: "json" };
import soundOoShort from "./phonics.sound-oo-short.json" with { type: "json" };
import soundAr from "./phonics.sound-ar.json" with { type: "json" };
import soundOr from "./phonics.sound-or.json" with { type: "json" };
import soundUr from "./phonics.sound-ur.json" with { type: "json" };
import soundOw from "./phonics.sound-ow.json" with { type: "json" };
import soundOi from "./phonics.sound-oi.json" with { type: "json" };
import soundEar from "./phonics.sound-ear.json" with { type: "json" };
import soundAir from "./phonics.sound-air.json" with { type: "json" };
import soundUre from "./phonics.sound-ure.json" with { type: "json" };
import soundSchwa from "./phonics.sound-schwa.json" with { type: "json" };
import { buildLabSkillFiles, labGames } from "./lab-games.js";
import { isSubject, subjects, type Subject } from "./subjects.js";
import { isYearGroup, type YearGroup } from "./year-groups.js";
import phonicsGamesYear1 from "./phonics-games.year-1.json" with { type: "json" };
import phonicsGamesYear2 from "./phonics-games.year-2.json" with { type: "json" };
import historyQuestsYear1 from "./history-quests.year-1.json" with { type: "json" };
import historyQuestsYear2 from "./history-quests.year-2.json" with { type: "json" };
import historyQuestsYear3 from "./history-quests.year-3.json" with { type: "json" };
import historyQuestsYear4 from "./history-quests.year-4.json" with { type: "json" };
import historyQuestsYear5 from "./history-quests.year-5.json" with { type: "json" };
import historyQuestsYear6 from "./history-quests.year-6.json" with { type: "json" };
import {
  isPhonicsSound,
  phonicsSounds,
  type PhonicsSound,
} from "./phonics-sounds.js";

export { isSubject, subjectNames, subjects, type Subject } from "./subjects.js";

export { isYearGroup, yearGroups, type YearGroup } from "./year-groups.js";

export interface MasteryRule {
  percentCorrect: number;
  separateDays: number;
}

interface SkillBasics {
  id: string;
  name: string;
  yearGroup: YearGroup;
  strand: string;
  prerequisites: string[];
  masteryRule: MasteryRule;
}

export interface PhonicsSkill extends SkillBasics {
  subject: "phonics";
  sounds: PhonicsSound[];
}

export const soundStrand = "grapheme-phoneme-correspondences";

interface SkillWithoutSounds extends SkillBasics {
  subject: Exclude<Subject, "phonics">;
}

export type Skill = PhonicsSkill | SkillWithoutSounds;

const defaultMasteryRule: MasteryRule = { percentCorrect: 80, separateDays: 3 };

const skillFields = [
  "id",
  "name",
  "subject",
  "yearGroup",
  "strand",
  "prerequisites",
  "masteryRule",
  "sounds",
];
const masteryRuleFields = ["percentCorrect", "separateDays"];

const skillIdShape = /^[a-z]+\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const yearGroupInSkillId = /(?:^|[.-])(?:y|yr|year)-?\d+(?:$|[.-])/;

const isWholeNumberBetween = (
  value: unknown,
  smallest: number,
  largest: number,
): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= smallest &&
  value <= largest;

const parseSkillId = (id: unknown): string => {
  if (typeof id !== "string") {
    throw new InvalidCurriculumFileError("A Skill must have an ID");
  }
  if (yearGroupInSkillId.test(id)) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" has a Year Group in its ID; the Year Group belongs in its yearGroup field`,
    );
  }
  if (!skillIdShape.test(id)) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" needs an ID shaped like "maths.number-bonds-10"`,
    );
  }
  return id;
};

const parseMasteryRule = (
  masteryRule: unknown,
  skillId: string,
): MasteryRule => {
  if (masteryRule === undefined) {
    return defaultMasteryRule;
  }
  const fields = readFields(
    masteryRule,
    masteryRuleFields,
    `The mastery rule of Skill "${skillId}"`,
  );
  const percentCorrect = fields.get("percentCorrect");
  const separateDays = fields.get("separateDays");

  if (!isWholeNumberBetween(percentCorrect, 1, 100)) {
    throw new InvalidCurriculumFileError(
      `Skill "${skillId}" needs a mastery rule percentCorrect from 1 to 100`,
    );
  }
  if (!isWholeNumberBetween(separateDays, 1, Number.MAX_SAFE_INTEGER)) {
    throw new InvalidCurriculumFileError(
      `Skill "${skillId}" needs a mastery rule of at least 1 separate day`,
    );
  }
  return { percentCorrect, separateDays };
};

const parseSkillSounds = (sounds: unknown, skillId: string): PhonicsSound[] => {
  if (!isNonEmptyList(sounds) || !sounds.every(isPhonicsSound)) {
    throw new InvalidCurriculumFileError(
      `Phonics Skill "${skillId}" needs its sounds as a list of one or more of ${phonicsSounds.join(", ")}`,
    );
  }
  const repeatedSound = findRepeat(sounds);
  if (repeatedSound !== undefined) {
    throw new InvalidCurriculumFileError(
      `Phonics Skill "${skillId}" lists the sound "${repeatedSound}" twice`,
    );
  }
  return sounds;
};

const parseSkill = (skillFile: unknown): Skill => {
  const fields = readFields(skillFile, skillFields, "A Skill file");
  const id = parseSkillId(fields.get("id"));
  const name = fields.get("name");
  const subject = fields.get("subject");
  const yearGroup = fields.get("yearGroup");
  const strand = fields.get("strand");
  const prerequisites = fields.get("prerequisites");

  if (typeof name !== "string" || name.trim() === "") {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" needs a name a Parent can read, like "Number bonds to 10"`,
    );
  }
  if (!isSubject(subject)) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" needs a Subject, one of ${subjects.join(", ")}`,
    );
  }
  if (!id.startsWith(`${subject}.`)) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" needs an ID that starts with its Subject, "${subject}."`,
    );
  }
  if (!isYearGroup(yearGroup)) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" needs a Year Group from 1 to 6`,
    );
  }
  if (typeof strand !== "string" || !kebabCaseShape.test(strand)) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" needs a strand shaped like "addition-and-subtraction"`,
    );
  }
  if (
    !Array.isArray(prerequisites) ||
    !prerequisites.every((prerequisite) => typeof prerequisite === "string")
  ) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" needs its prerequisites as a list of Skill IDs`,
    );
  }

  const skillBasics = {
    id,
    name,
    yearGroup,
    strand,
    prerequisites,
    masteryRule: parseMasteryRule(fields.get("masteryRule"), id),
  };
  const sounds = fields.get("sounds");

  if (subject === "phonics") {
    return {
      ...skillBasics,
      subject,
      sounds:
        strand === soundStrand || sounds !== undefined
          ? parseSkillSounds(sounds, id)
          : [],
    };
  }
  if (sounds !== undefined) {
    throw new InvalidCurriculumFileError(
      `Skill "${id}" has sounds, which only a Phonics Skill has`,
    );
  }
  return { ...skillBasics, subject };
};

export const parseSkills = (skillFiles: readonly unknown[]): Skill[] => {
  const skills = skillFiles.map(parseSkill);
  const skillIds = new Set<string>();

  for (const { id } of skills) {
    if (skillIds.has(id)) {
      throw new InvalidCurriculumFileError(`Two Skills have the ID "${id}"`);
    }
    skillIds.add(id);
  }
  for (const { id, prerequisites } of skills) {
    const missingPrerequisite = prerequisites.find(
      (prerequisite) => !skillIds.has(prerequisite),
    );
    if (missingPrerequisite !== undefined) {
      throw new InvalidCurriculumFileError(
        `Skill "${id}" needs "${missingPrerequisite}", which isn't a Skill`,
      );
    }
  }
  return skills;
};

export const phonicsGameFiles = [phonicsGamesYear1, phonicsGamesYear2];

const buildPhonicsGameSkillFiles = ({
  yearGroup,
  games,
}: (typeof phonicsGameFiles)[number]) =>
  games.map(({ skillId, skillName, strand }) => ({
    id: skillId,
    name: skillName,
    subject: "phonics",
    yearGroup,
    strand,
    prerequisites: [],
  }));

const historyQuestLists = [
  historyQuestsYear1,
  historyQuestsYear2,
  historyQuestsYear3,
  historyQuestsYear4,
  historyQuestsYear5,
  historyQuestsYear6,
];

export const historyQuestFiles: readonly unknown[] = historyQuestLists;

export const skills = parseSkills([
  numberBonds10,
  countObjectsTo20,
  oneMoreOneLess,
  name3dShapes,
  capitalLetters,
  englishAOrAn,
  englishAdverbialsOfTimeAndNumber,
  englishAlphabetOrder,
  englishAlphabeticalOrderFirstFourLetters,
  englishAlphabeticalOrderFirstThreeLetters,
  englishAlphabeticalOrderFirstTwoLetters,
  englishCapitalLettersForNames,
  englishColonsSemiColonsAndHyphens,
  englishComparativesAndSuperlativesErEst,
  englishCompoundWords,
  englishConjunctions,
  englishContractions,
  englishDeterminersAndPronouns,
  englishFormalExpandedContractions,
  englishFormalVocabulary,
  englishFrontedAdverbialCommasAndSpeech,
  englishGreekAndLatinRoots,
  englishHomophones,
  englishHomophonesAcceptToMail,
  englishHomophonesAdviceToGuessed,
  englishHomophonesHeardToWary,
  englishHomophonesMainToWhose,
  englishHyphensAfterPrefixes,
  englishInvertedCommasForSpeech,
  englishIrregularPluralPossessives,
  englishJoiningWithAnd,
  englishLinkingAdverbials,
  englishListCommasAndSentenceTypes,
  englishModalVerbContractions,
  englishModalVerbsAndRelativePronouns,
  englishNounsVerbsAdjectivesAdverbs,
  englishParenthesisAndClarifyingCommas,
  englishPluralPossessiveApostrophes,
  englishPluralsSEs,
  englishPluralsYToIes,
  englishPrefixUn,
  englishPrefixesDisMisReSubSuperAntiAuto,
  englishPrefixesInIlImIrInter,
  englishPrepositionsAndConjunctions,
  englishRelativeClauses,
  englishRhymesWithDifferentSpellings,
  englishRhymingWords,
  englishSentencePunctuation,
  englishSpellingFfLlSsZzCkNkTch,
  englishStandardEnglishVerbForms,
  englishSubjectAndObject,
  englishSubjectVerbAgreement,
  englishSubjunctiveAndFormalVerbs,
  englishSubordinatingConjunctions,
  englishSuffixSpellingRules,
  englishSuffixesAbleIbleCiousCial,
  englishSuffixesFerAntAnceEntEnce,
  englishSuffixesFulLessNessLy,
  englishSuffixesIngEdErEst,
  englishSuffixesLyAtionAndDoubling,
  englishSuffixesOusTionSionCian,
  englishSynonymNouns,
  englishTimeAndCauseConjunctions,
  englishVerbSuffixesAteIseIfyEn,
  englishWordFamilies,
  englishUnderstandingWhatIRead,
  englishQuestionsAboutAText,
  englishInferenceAndPrediction,
  englishMainIdeasAndThemes,
  englishInferenceWithEvidence,
  englishSummarisingAndComparingTexts,
  englishSequencingSentences,
  englishPlanningANarrative,
  englishParagraphsAndHeadings,
  englishSettingsCharactersAndPlot,
  englishWritingForAudienceAndPurpose,
  englishCohesionAcrossParagraphs,
  addSubtractFactsTo20,
  timesTables348,
  timesTablesTo12,
  multiplyDivideBy101001000,
  orderOfOperations,
  fractionsOfShapes,
  equivalentFractions,
  fractionsAsDecimals,
  fractionsDecimalsPercentages,
  fractionsAsDecimalEquivalents,
  commonExceptionWords,
  moreCommonExceptionWords,
  wordListLowerKeyStage2,
  wordListUpperKeyStage2,
  addWithin20,
  subtractWithin20,
  countInSteps,
  compareHeights,
  halvesAndQuarters,
  tellTheTime,
  tensAndOnes,
  tenMoreTenLess,
  shapeProperties,
  addTwoDigit,
  subtractTwoDigit,
  countInThreesAndTens,
  measureInCentimetres,
  timeToFiveMinutes,
  squaresCubesAndPowersOfTen,
  hundredsTensAndOnes,
  thousandsHundredsTensAndOnes,
  decimalPlaceValue,
  numbersToTenMillion,
  tenOrHundredMoreOrLess,
  thousandMoreOrLess,
  powersOfTenMoreOrLess,
  negativeNumbers,
  rightAnglesAndSides,
  classifyTrianglesAndQuadrilaterals,
  regularAndIrregularPolygons,
  netsOf3dShapes,
  addThreeDigit,
  addFourDigit,
  addDecimals,
  addLargeNumbers,
  subtractThreeDigit,
  subtractFourDigit,
  subtractDecimals,
  subtractLargeNumbers,
  countInFoursEightsAndFifties,
  countInSixesSevensAndTwentyFives,
  countInPowersOfTenAndTenths,
  linearSequences,
  measureInMillimetres,
  perimeterOfRectangles,
  areaOfRectangles,
  volumeOfCuboids,
  unitAndNonUnitFractions,
  familiesOfEquivalentFractions,
  timeToTheMinute,
  twentyFourHourClock,
  laterTimes,
  durations,
  multiplyAndDivideWithObjects,
  timesTables2510,
  ratioAndScale,
  positionAndTurns,
  clockwiseTurns,
  coordinatesFirstQuadrant,
  reflectionAndTranslation,
  coordinatesFourQuadrants,
  tallyChartsAndPictograms,
  barChartsAndTables,
  lineGraphs,
  tablesAndTimetables,
  pieChartsAndMean,
  multiplyLargeNumbers,
  divideLargeNumbers,
  addSubtractFractions,
  multiplyDivideFractions,
  percentagesOfAmounts,
  simpleFormulae,
  meanAndTables,
  missingAngles,
  convertUnits,
  englishVerbTenses,
  englishActiveAndPassiveVoice,
  englishReadingRetrieval,
  englishReadingInference,
  englishReadingVocabulary,
  englishReadingSummarisingAndSequencing,
  soundB,
  soundCh,
  soundD,
  soundF,
  soundG,
  soundH,
  soundJ,
  soundK,
  soundL,
  soundM,
  soundN,
  soundNg,
  soundP,
  soundR,
  soundS,
  soundSh,
  soundT,
  soundThUnvoiced,
  soundThVoiced,
  soundV,
  soundW,
  soundY,
  soundZ,
  soundZh,
  soundA,
  soundE,
  soundI,
  soundO,
  soundU,
  soundAi,
  soundEe,
  soundIgh,
  soundOa,
  soundOoLong,
  soundOoShort,
  soundAr,
  soundOr,
  soundUr,
  soundOw,
  soundOi,
  soundEar,
  soundAir,
  soundUre,
  soundSchwa,
  computingSingleStepInstructions,
  computingNameTechnology,
  computingDigitalPainting,
  computingGroupObjects,
  computingEverydayAlgorithms,
  computingDebugARoute,
  computingPredictARoute,
  computingAskForHelpOnline,
  computingKeyboardKeys,
  computingAnimationPrograms,
  computingTechnologyBeyondSchool,
  computingTakingPhotos,
  computingPlanARoute,
  computingPictograms,
  computingDigitalMusic,
  computingProgramAQuiz,
  computingDebugAnAlgorithm,
  computingPredictLongerPrograms,
  computingKeepInformationPrivate,
  computingBeKindOnline,
  computingConnectComputers,
  computingStopFrameAnimation,
  computingSequenceSounds,
  computingBranchingDatabases,
  computingDesktopPublishing,
  computingEventsAndActions,
  computingDecomposeATask,
  computingDebugASequence,
  computingStrongPasswords,
  computingInputsAndOutputs,
  computingHowTheInternetWorks,
  computingWorldWideWeb,
  computingAudioEditing,
  computingRepetitionInShapes,
  computingRepetitionInGames,
  computingDataLogging,
  computingPhotoEditing,
  computingDebugLoops,
  computingReliableInformation,
  computingDigitalFootprint,
  computingOnlineCollaboration,
  computingVideoProduction,
  computingSelectionPhysicalComputing,
  computingFlatFileDatabases,
  computingVectorDrawing,
  computingSelectionInQuizzes,
  computingExplainAlgorithms,
  computingSearchRanking,
  computingChooseSensors,
  computingReportConcerns,
  computingEffectiveSearching,
  computingWebpageCreation,
  computingVariablesInGames,
  computingSpreadsheets,
  computing3dModelling,
  computingSensingMovement,
  computingDesignAGame,
  computingDebugWithVariables,
  computingInternetCommunication,
  computingResponsibleSharing,
  ...phonicsGameFiles.flatMap(buildPhonicsGameSkillFiles),
  ...buildLabSkillFiles(labGames),
  musicLoudAndQuiet,
  musicFastAndSlow,
  musicHighAndLow,
  musicSteadyBeat,
  musicBodyPercussionPatterns,
  musicUntunedPercussion,
  musicMusicDescribesAnimals,
  musicLongAndShort,
  musicSameOrDifferent,
  musicMelodyDirection,
  musicChantsAndRhymes,
  musicCrotchetsAndQuavers,
  musicGettingLouderAndQuieter,
  musicGettingFasterAndSlower,
  musicStepsAndLeaps,
  musicTunedPercussion,
  musicHearingRests,
  musicTunedInstruments,
  musicMusicAndMood,
  musicDotNotation,
  musicFinishedOrNot,
  musicBeatsInABar,
  musicNoteValues,
  musicForteAndPiano,
  musicTempoWords,
  musicOstinato,
  musicNotesOnTheStave,
  musicLayersOfSound,
  musicInstrumentFamilies,
  musicCompleteTheBar,
  musicDoReMi,
  musicRhythmDictation,
  musicMajorAndMinor,
  musicKeyboardLetterNames,
  musicCrescendoAndDiminuendo,
  musicBinaryAndTernary,
  musicTimeSignatures,
  musicChordsAndSingleNotes,
  musicOrchestralInstruments,
  musicUnisonHarmonyAndRounds,
  musicHowInstrumentsMakeSound,
  musicDottedRhythms,
  musicChordsOneFourFive,
  musicIntervals,
  musicTrebleClefNotes,
  musicSharpsAndFlats,
  musicBaroqueAndClassicalComposers,
  musicSyncopation,
  musicScales,
  musicAddingNoteValues,
  musicRondoForm,
  musicPeriodsOfMusic,
  musicRomanticComposers,
  musicBassClefNotes,
  musicArticulation,
  musicTriads,
  musicKeySignatures,
  musicMusicForFilm,
  musicTripletsAndSyncopation,
  musicMelodyDictation,
  musicConductingPatterns,
  ...buildGeographySkillFiles(geographyGames),
  ...historyQuestLists.flatMap(({ quests }) =>
    quests.map(({ skill }) => skill),
  ),
]);
