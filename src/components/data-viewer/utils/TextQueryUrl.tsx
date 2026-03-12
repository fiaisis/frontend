export function TextQueryUrl(
  apiUrl: string,
  instrument?: string,
  experimentNumber?: string,
  userNumber?: string
): string | null {
  if (instrument != null && experimentNumber != null) {
    return `${apiUrl}/text/instrument/${instrument}/experiment_number/${experimentNumber}`;
  }
  if (userNumber != null) {
    return `${apiUrl}/text/generic/user_number/${userNumber}`;
  }
  if (experimentNumber != null) {
    return `${apiUrl}/text/generic/experiment_number/${experimentNumber}`;
  }
  return null;
}
