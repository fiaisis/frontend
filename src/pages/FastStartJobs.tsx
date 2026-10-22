import React, { ReactElement } from 'react';

import Jobs from './Jobs';

/**
 * Set to `true` once fast start jobs are associated with user numbers in the backend
 * to allow non-staff users (and staff in "View as user" mode) to query fast start jobs.
 */
export const FAST_START_USER_VIEW_ENABLED = false;

export interface FastStartJobsProps {
  userViewEnabled?: boolean;
}

const FastStartJobs: React.FC<FastStartJobsProps> = ({
  userViewEnabled = FAST_START_USER_VIEW_ENABLED,
}): ReactElement => <Jobs mode="fast-start-jobs" userViewEnabled={userViewEnabled} />;

export default FastStartJobs;
