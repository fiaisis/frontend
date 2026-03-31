export function FileQueryUrl(instrument?: string, experimentNumber?: string, userNumber?: string): string | null {
  if (instrument != null && experimentNumber != null) {
    return `find_file/instrument/${instrument}/experiment_number/${experimentNumber}`;
  }
  if (userNumber != null) {
    return `find_file/generic/user_number/${userNumber}`;
  }
  if (experimentNumber != null) {
    return `find_file/generic/experiment_number/${experimentNumber}`;
  }
  return null;
}
