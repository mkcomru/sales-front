const VOICE_EXTENSIONS = /\.(ogg|opus|mp3|m4a|wav|webm)(\?|$)/i;
const VOICE_PATH = /\/(voice|audio)\//;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp)(\?|$)/i;
const IMAGE_PATH = /\/image\//;

export function isVoiceArtifactId(artifactId: string): boolean {
  return VOICE_EXTENSIONS.test(artifactId) || VOICE_PATH.test(artifactId);
}

export function isImageArtifactId(artifactId: string): boolean {
  return IMAGE_EXTENSIONS.test(artifactId) || IMAGE_PATH.test(artifactId);
}

export function isDocumentArtifactId(artifactId: string): boolean {
  return !isVoiceArtifactId(artifactId) && !isImageArtifactId(artifactId);
}
