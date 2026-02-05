import { isPreview } from '../utils/env';
import { localDbClient } from './localDbClient';
import { firestoreDbClient } from './firestoreDbClient';

export const dbClient = isPreview() ? localDbClient : firestoreDbClient;