/**
 * Response shapes, derived from the backend's own models.
 *
 * Nothing is redeclared here — each type is read back out of the API surface,
 * so these cannot drift from what the server actually returns.
 */

import type { App } from 'trptools-backend';
import type { Treaty } from '@elysiajs/eden';

type Api = Treaty.Create<App>;

/** Unwraps `{ data, error }` down to the success payload. */
type Data<T> = T extends Promise<infer R> ? (R extends { data: infer D } ? NonNullable<D> : never) : never;

export type SessionResponse = Data<ReturnType<Api['auth']['session']['get']>>;
export type SessionUser = NonNullable<SessionResponse['user']>;

export type GroupSummary = Data<ReturnType<Api['groups']['get']>>[number];
export type CreatableGroup = Data<ReturnType<Api['groups']['creatable']['get']>>[number];

export type RouteRecord = Data<ReturnType<Api['routes']['get']>>[number];
export type RouteShape = RouteRecord['shape'];
export type Depot = Data<ReturnType<Api['depots']['get']>>[number];
export type MediaItem = Data<ReturnType<Api['media']['get']>>[number];
export type ModerationStatus = RouteRecord['moderation'];

/** The public group page, unwrapped from its parameterised accessor. */
type PublicGroupPage = Data<ReturnType<ReturnType<Api['public']['groups']>['get']>>;

export type RosterEntry = PublicGroupPage['roster'][number];
export type PublicDepot = PublicGroupPage['depots'][number];
export type PublicRoute = PublicGroupPage['routes'][number];

/** The standalone route, depot and shift pages under a group. */
type PublicGroupApi = ReturnType<Api['public']['groups']>;

export type PublicRoutePage = Data<ReturnType<ReturnType<PublicGroupApi['routes']>['get']>>;
export type PublicDepotPage = Data<ReturnType<ReturnType<PublicGroupApi['depots']>['get']>>;
export type PublicShiftPage = Data<ReturnType<ReturnType<PublicGroupApi['shifts']>['get']>>;
export type PublicGroupHeader = PublicRoutePage['group'];

export type RoomPresence = Data<
	ReturnType<ReturnType<Api['dispatch']>['presence']['get']>
>[number];

export type AdminReport = Data<ReturnType<Api['admin']['reports']['get']>>[number];
export type AdminOverview = Data<ReturnType<Api['admin']['overview']['get']>>;
export type AdminUser = Data<ReturnType<Api['admin']['users']['get']>>[number];
export type AuditEntry = Data<ReturnType<ReturnType<Api['groups']>['audit']['get']>>[number];

export type ReportTarget = 'GROUP' | 'ROUTE' | 'DEPOT' | 'MEDIA';

export type ShiftEvent = Data<ReturnType<Api['schedule']['get']>>[number];
export type ShiftOccurrence = Data<ReturnType<Api['schedule']['occurrences']['get']>>[number];
/** One rank's sign-up sheet as it applies to a single occurrence. */
export type SignupSheet = ShiftOccurrence['sheets'][number];
export type SignupSlot = SignupSheet['slots'][number];
export type SignupUser = SignupSlot['signups'][number];

/** The bot page: stored settings plus the bot's live standing in the guild. */
export type BotOverview = Data<ReturnType<ReturnType<Api['bot']>['get']>>;
export type BotConfig = NonNullable<BotOverview['config']>;
export type BotGuildStatus = NonNullable<BotOverview['guild']>;
export type BotChannel = Data<ReturnType<ReturnType<Api['bot']>['channels']['get']>>[number];
export type BotRole = Data<ReturnType<ReturnType<Api['bot']>['roles']['get']>>[number];

/** A rank's sign-up sheet as the ranks dashboard edits it. */
export type RankSignup = NonNullable<Data<ReturnType<ReturnType<Api['ranks']>['signup']['get']>>>;
export type RankSignupSlot = RankSignup['slots'][number];

export type PublicGroupSummary = Data<ReturnType<Api['public']['groups']['get']>>[number];

export type ApiKey = Data<ReturnType<Api['auth']['keys']['get']>>[number];
export type StageProgramSummary = Data<ReturnType<Api['tools']['stage']['get']>>[number];

export type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

/** Permission levels, mirroring the backend's ladder. */
export const PERMISSION = {
	NONE: 0,
	DISPATCH: 1,
	HOST: 2,
	MANAGE: 3
} as const;

export const PERMISSION_LABELS: Record<number, string> = {
	0: 'No access',
	1: 'Dispatch',
	2: 'Host',
	3: 'Manage group'
};

export const PERMISSION_DESCRIPTIONS: Record<number, string> = {
	0: 'Cannot use TrPTools for this group.',
	1: 'Can join a dispatch room and assign routes.',
	2: 'Can start and end shifts, and open dispatch rooms.',
	3: 'Full control, including ranks, routes and settings.'
};

/** A dispatch vehicle as it arrives over the realtime stream. */
export interface DispatchVehicle {
	id: string;
	ownerId: string;
	name: string;
	/** The spawn name the game reported. */
	depot: string;
	/** The depot it resolved to, or null when nothing matched. */
	depotId: string | null;
	route: string | null;
	routeName: string | null;
	routeColor: string | null;
	category: 'TROLLEYBUS' | 'SERVICE' | 'STAFF' | 'OTHER';
	assigned: boolean;
	towing: boolean;
	note: string;
}

export type DispatchStreamEvent =
	| { event: 'SYNC'; data: DispatchVehicle[] }
	| { event: 'ADD'; data: DispatchVehicle }
	| { event: 'UPDATE'; data: Partial<DispatchVehicle> & { id: string } }
	| { event: 'DELETE'; data: string }
	| { event: 'PRESENCE'; data: string[] }
	| { event: 'CLOSED' }
	| { event: 'HEARTBEAT' };

export const VEHICLE_CATEGORY_LABELS: Record<DispatchVehicle['category'], string> = {
	TROLLEYBUS: 'Trolleybuses',
	SERVICE: 'Service vehicles',
	STAFF: 'Staff vehicles',
	OTHER: 'Other vehicles'
};

export const VEHICLE_CATEGORY_ORDER: DispatchVehicle['category'][] = [
	'TROLLEYBUS',
	'SERVICE',
	'STAFF',
	'OTHER'
];
