/**
 * The Piper voice models Read it to me speaks with (ADR 0062, ADR 0074):
 * sixteen voices, all but two of them from the UK and Ireland. Four models
 * come from Bryce Beattie's page, https://brycebeattie.com/files/tts/, and
 * four from Piper's own en_GB voices, https://huggingface.co/rhasspy/piper-voices,
 * at a pinned revision. Every file is pinned by size and SHA-256. The
 * server's `download-voices` command fetches each one from its own address
 * and refuses one that doesn't match; the app serves them from its own
 * origin, and a device keeps each one it has used.
 *
 * Shared by the client (which lists the voices) and the server (which serves
 * them), so it lives beside the curriculum both already import.
 */

export const bryceBeattieSource = "https://sfo3.digitaloceanspaces.com/bkmdls/";

/** Piper's own voices, at the revision their pins were taken from. */
export const piperVoicesRevision = "e9c8a39444359388adaa94255becb37a5a2b8e51";

export const piperVoicesSource = `https://huggingface.co/rhasspy/piper-voices/resolve/${piperVoicesRevision}/en/en_GB/`;

export type PiperVoiceLicence =
  "public-domain" | "jenny" | "cc-by-4" | "cc-by-sa-4" | "cc-by-nc-sa-4";

export interface PiperFile {
  name: string;
  /** Where `download-voices` fetches it from. */
  url: string;
  bytes: number;
  sha256: string;
}

export interface PiperModel {
  id: string;
  /** What the model is called where it comes from. */
  label: string;
  description: string;
  accent: string;
  /** Female or male for a one-speaker model; a many-speaker model has both. */
  voice?: "female" | "male";
  licence: PiperVoiceLicence;
  model: PiperFile;
  config: PiperFile;
}

export const piperModels: readonly PiperModel[] = [
  {
    id: "northern-english-male",
    label: "Northern English Male",
    description:
      "Northern English Male, medium quality, from Piper's own voices",
    accent: "UK English (Northern England)",
    voice: "male",
    licence: "cc-by-sa-4",
    model: {
      name: "en_GB-northern_english_male-medium.onnx",
      url: `${piperVoicesSource}northern_english_male/medium/en_GB-northern_english_male-medium.onnx`,
      bytes: 63201294,
      sha256:
        "57a219ae8e638873db7d18893304be5069c42868f392bb95c3ff17f0690d0689",
    },
    config: {
      name: "en_GB-northern_english_male-medium.onnx.json",
      url: `${piperVoicesSource}northern_english_male/medium/en_GB-northern_english_male-medium.onnx.json`,
      bytes: 4847,
      sha256:
        "69557ed3d974463453e9b0c09dd99a7ed0e52b8b87b64b357dbeeb2540a97d47",
    },
  },
  {
    id: "cori-med",
    label: "Cori",
    description: "Cori, medium quality",
    accent: "UK English",
    voice: "female",
    licence: "public-domain",
    model: {
      name: "cori-med.onnx",
      url: `${bryceBeattieSource}cori-med.onnx`,
      bytes: 63531379,
      sha256:
        "1899f98e5fb8310154f3c2973f4b8a929ba7245e722b3d3a85680b833d95f10d",
    },
    config: {
      name: "cori-med.onnx.json",
      url: `${bryceBeattieSource}cori-med.onnx.json`,
      bytes: 7087,
      sha256:
        "4e4e862c06be95e268cb2edeb18eed39b4fc51c515d808ed3c51404f20e96fea",
    },
  },
  {
    id: "jenny",
    label: "Jenny",
    description: "Jenny (Dioco), medium quality",
    accent: "Irish English",
    voice: "female",
    licence: "jenny",
    model: {
      name: "jenny.onnx",
      url: `${bryceBeattieSource}jenny.onnx`,
      bytes: 63531379,
      sha256:
        "d33f72ffbabcbbcb673ff6fac06949e8b1a0e56fca0ffd97ae557ac614bab8f1",
    },
    config: {
      name: "jenny.onnx.json",
      url: `${bryceBeattieSource}jenny.onnx.json`,
      bytes: 7084,
      sha256:
        "39bae6c39dac08347a1232ecfafae9e0d18028c180b23a0a4da18105948a3330",
    },
  },
  {
    id: "kristin",
    label: "Kristin",
    description: "Kristin, medium quality",
    accent: "US English",
    voice: "female",
    licence: "public-domain",
    model: {
      name: "kristin.onnx",
      url: `${bryceBeattieSource}kristin.onnx`,
      bytes: 63531379,
      sha256:
        "5849957f929cbf720c258f8458692d6103fff2f0e3d3b19c8259474bb06a18d4",
    },
    config: {
      name: "kristin.onnx.json",
      url: `${bryceBeattieSource}kristin.onnx.json`,
      bytes: 7086,
      sha256:
        "d34362d5b723e2031d6b0ebb5d7c1254cd59d11691e2979147fd518cba5663b2",
    },
  },
  {
    id: "john",
    label: "John",
    description: "John, medium quality, fine-tuned from Kristin",
    accent: "US English",
    voice: "male",
    licence: "public-domain",
    model: {
      name: "john.onnx",
      url: `${bryceBeattieSource}john.onnx`,
      bytes: 63531379,
      sha256:
        "789c6c875726e627ddee93d51d8727859abe9c091c3d141591f4b83c2072e988",
    },
    config: {
      name: "john.onnx.json",
      url: `${bryceBeattieSource}john.onnx.json`,
      bytes: 7083,
      sha256:
        "1d0433ba8a5182d0295dfcb6c036e9fd27b722f4d379a61fb84472d29b08529f",
    },
  },
  {
    id: "alba",
    label: "Alba",
    description: "Alba, medium quality, from Piper's own voices",
    accent: "UK English (Scotland)",
    voice: "female",
    licence: "cc-by-4",
    model: {
      name: "en_GB-alba-medium.onnx",
      url: `${piperVoicesSource}alba/medium/en_GB-alba-medium.onnx`,
      bytes: 63221984,
      sha256:
        "1f9da809b6da1ef4190bb5dd6cce4f4af803274539e9cf9e0693085150bac3d7",
    },
    config: {
      name: "en_GB-alba-medium.onnx.json",
      url: `${piperVoicesSource}alba/medium/en_GB-alba-medium.onnx.json`,
      bytes: 6295,
      sha256:
        "ed4b1f015a8aae5eb26d4bdeed7b712c660f5698a0dd954aa6df9c8be60b900b",
    },
  },
  {
    id: "semaine",
    label: "SEMAINE",
    description:
      "SEMAINE: 4 UK English actors, medium quality, from Piper's own voices",
    accent: "UK English",
    licence: "cc-by-nc-sa-4",
    model: {
      name: "en_GB-semaine-medium.onnx",
      url: `${piperVoicesSource}semaine/medium/en_GB-semaine-medium.onnx`,
      bytes: 76737711,
      sha256:
        "d6dab6f3b92db43ea3f78c7f20dc8eadb47a1f15d8a1c9d451cf3ccd201a2f66",
    },
    config: {
      name: "en_GB-semaine-medium.onnx.json",
      url: `${piperVoicesSource}semaine/medium/en_GB-semaine-medium.onnx.json`,
      bytes: 5076,
      sha256:
        "6425dcb878684043b77d772b173ae006d86a583b110303edda48b8438ecee5ee",
    },
  },
  {
    id: "vctk",
    label: "VCTK",
    description:
      "VCTK: 109 readers from around the UK and beyond, medium quality, from Piper's own voices",
    accent: "UK English",
    licence: "cc-by-4",
    model: {
      name: "en_GB-vctk-medium.onnx",
      url: `${piperVoicesSource}vctk/medium/en_GB-vctk-medium.onnx`,
      bytes: 76972979,
      sha256:
        "fc3d92d266b1a6c03af2a38215e0eee430ca7fb360f641d7c3dcb17c7670c0f3",
    },
    config: {
      name: "en_GB-vctk-medium.onnx.json",
      url: `${piperVoicesSource}vctk/medium/en_GB-vctk-medium.onnx.json`,
      bytes: 8061,
      sha256:
        "8cc5a7678bf893c35cb6fde5d0812fb7e2b63e1eef54db250afd525277471f2d",
    },
  },
];

export const listPiperFiles = (): PiperFile[] =>
  piperModels.flatMap(({ model, config }) => [model, config]);

/** Where a file is served from: its fingerprint first, so a changed file is a new address. */
export const findPiperFilePath = ({ name, sha256 }: PiperFile): string =>
  `/voices/${sha256.slice(0, 16)}/${name}`;
