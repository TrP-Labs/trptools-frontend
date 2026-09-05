/**
 * Response shapes, derived from the backend's own models.
 *
 * Nothing is redeclared here — each type is read back out of the API surface,
 * so these cannot drift from what the server actually returns.
 */

import type { App } from 'trptools-backend';
import type { Treaty } from '@elysiajs/eden';
import { m } from '$lib/paraglide/messages.js';
import type { Translations } from '$lib/utils/translations';

type Api = Treaty.Create<App>;

/** Unwraps `{ data, error }` down to the success payload. */
type Data<T> = T extends Promise<infer R> ? (R extends { data: infer D } ? NonNullable<D> : never) : never;

export type SessionResponse = Data<ReturnType<Api['auth']['session']['get']>>;
export type SessionUser = NonNullable<SessionResponse['user']>;

export type GroupSummary = Data<ReturnType<Api['groups']['get']>>[number];

/** The signed-in home page, gathered across every group in one request. */
export type DashboardData = Data<ReturnType<Api['dashboard']['get']>>;
export type DashboardGroup = DashboardData['groups'][number];
export type DashboardShift = DashboardData['shifts'][number];
export type DashboardReview = DashboardData['reviews'][number];
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
export type PublicOpenApplication = PublicGroupPage['openApplications'][number];

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
export type BotCleanup = Data<ReturnType<ReturnType<Api['bot']>['cleanup']['get']>>;

/** A rank's sign-up sheet as the ranks dashboard edits it. */
export type RankSignup = NonNullable<Data<ReturnType<ReturnType<Api['ranks']>['signup']['get']>>>;
export type RankSignupSlot = RankSignup['slots'][number];

/** Staff application forms, as the dashboard manages them. */
export type ApplicationSummary = Data<ReturnType<Api['applications']['get']>>[number];
export type ApplicationDetail = Data<ReturnType<ReturnType<Api['applications']>['get']>>;
export type ApplicationQuestion = ApplicationDetail['questions'][number];
export type ApplicationQuestionType = ApplicationQuestion['type'];
export type ApplicationSubmission = Data<
	ReturnType<ReturnType<Api['applications']>['submissions']['get']>
>[number];
export type ApplicationSubmissionDetail = Data<
	ReturnType<ReturnType<Api['applications']['submissions']>['get']>
>;
export type ApplicationAnswer = ApplicationSubmissionDetail['answers'][number];
export type ApplicationStatus = ApplicationSubmission['status'];

/** The same form as an applicant reads it, and what they have already sent. */
export type PublicApplication = Data<
	ReturnType<ReturnType<PublicGroupApi['applications']>['get']>
>;
/** Where the signed-in caller stands with one form. */
export type ApplicationStanding = Data<ReturnType<ReturnType<Api['applications']>['me']['get']>>;
export type ApplicationBlocker = ApplicationStanding['blockedBy'];

/**
 * A question as the builder edits it.
 *
 * Structural rather than the API's own type: a question being written has no
 * id yet, and none of the fields the server fills in.
 */
export interface QuestionDraft {
	id?: string;
	type: ApplicationQuestionType;
	prompt: string;
	description: string;
	/**
	 * Every other language's version of this component's text.
	 *
	 * `prompt` and `description` are keyed by name; a choice is keyed by its
	 * position, `option:0` upwards, since an array has nothing else stable to
	 * key it by.
	 */
	translations: Translations;
	required: boolean;
	options: string[];
	maxLength: number | null;
	mediaId: string | null;
	image: string | null;
}

/**
 * What each component is called where a group picks one.
 *
 * A function rather than a `Record`, like every label table below it. A
 * constant object is built once when the module is first imported, which on
 * the server happens before any request has established a locale — the first
 * language to be rendered would have been baked in for every later one.
 */
export function questionTypeLabel(type: ApplicationQuestionType): string {
	switch (type) {
		case 'SHORT_TEXT':
			return m.question_type_short_answer();
		case 'LONG_TEXT':
			return m.question_type_long_answer();
		case 'MULTIPLE_CHOICE':
			return m.question_type_multiple_choice();
		case 'CHECKBOXES':
			return m.question_type_checkboxes();
		case 'SECTION':
			return m.question_type_text_block();
		case 'IMAGE':
			return m.question_type_image();
	}
}

/** Components that are read rather than answered. */
export const STATIC_QUESTION_TYPES: ApplicationQuestionType[] = ['SECTION', 'IMAGE'];

export const CHOICE_QUESTION_TYPES: ApplicationQuestionType[] = ['MULTIPLE_CHOICE', 'CHECKBOXES'];

export function applicationStatusLabel(status: ApplicationStatus): string {
	switch (status) {
		case 'PENDING':
			return m.application_status_waiting();
		case 'APPROVED':
			return m.application_status_approved();
		case 'DENIED':
			return m.application_status_denied();
	}
}

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

export function permissionLabel(level: number): string {
	switch (level) {
		case PERMISSION.DISPATCH:
			return m.permission_dispatch();
		case PERMISSION.HOST:
			return m.permission_host();
		case PERMISSION.MANAGE:
			return m.permission_manage_group();
		default:
			return m.permission_no_access();
	}
}

export function permissionDescription(level: number): string {
	switch (level) {
		case PERMISSION.DISPATCH:
			return m.permission_description_dispatch();
		case PERMISSION.HOST:
			return m.permission_description_host();
		case PERMISSION.MANAGE:
			return m.permission_description_manage();
		default:
			return m.permission_description_none();
	}
}

/**
 * A route as the dispatch board needs it.
 *
 * Structural on purpose: a group's own route rows satisfy it, and so do the
 * built-in routes the personal board at `/tools/dispatch` is given, which are
 * not rows anywhere and carry none of what a group decides for itself.
 */
export interface BoardRoute {
	id: string;
	name: string;
	/**
	 * Per-language versions of the name, for a group's own route.
	 *
	 * Optional because the personal board at `/tools/dispatch` draws the
	 * game's built-in routes, which are not rows anywhere — and a built-in's
	 * name is the game's and cannot be translated in any case.
	 */
	translations?: Translations;
	color: string;
	textColor: string;
	shape: RouteShape;
	icon: string | null;
	/** Depot ids this route runs from. Empty means every depot. */
	depots: string[];
}

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
	/** The id of the vehicle this one is towing, or null. Service vehicles only. */
	towing: string | null;
	/** Free text shown in place of a route, when the dispatcher wrote one. */
	note: string;
	/** Where a service vehicle is, in the dispatcher's own words. */
	location: string;
	status: ServiceStatus;
}

export type ServiceStatus = 'AWAITING' | 'ENROUTE' | 'ON_SCENE' | 'RETURNING';

export type DispatchStreamEvent =
	| { event: 'SYNC'; data: DispatchVehicle[] }
	| { event: 'ADD'; data: DispatchVehicle }
	| { event: 'UPDATE'; data: Partial<DispatchVehicle> & { id: string } }
	| { event: 'DELETE'; data: string }
	| { event: 'PRESENCE'; data: string[] }
	| { event: 'CLOSED' }
	| { event: 'HEARTBEAT' };

/** How a manager labels a vehicle in group settings. */
export function vehicleCategoryLabel(category: DispatchVehicle['category']): string {
	switch (category) {
		case 'SERVICE':
			return m.vehicle_category_service();
		case 'STAFF':
			return m.vehicle_category_staff();
		case 'TROLLEYBUS':
			return m.vehicle_category_vehicle();
		case 'OTHER':
			return m.vehicle_category_unclassified();
	}
}

/**
 * The lists the dispatch page draws.
 *
 * A *bucket* is not quite a category: scenery is recognised by having no
 * owner rather than by its model, and the two categories that take routes —
 * a classified vehicle and one nobody has classified — belong in the same
 * list, because a dispatcher assigning routes does not care which it is.
 */
export type VehicleBucket = 'SERVICE' | 'STAFF' | 'NORMAL' | 'DECORATIVE';

export const VEHICLE_BUCKET_ORDER: VehicleBucket[] = ['SERVICE', 'STAFF', 'NORMAL', 'DECORATIVE'];

export function vehicleBucketLabel(bucket: VehicleBucket): string {
	switch (bucket) {
		case 'SERVICE':
			return m.vehicle_bucket_service();
		case 'STAFF':
			return m.vehicle_bucket_staff();
		// Not "Trolleybuses": the same list carries trams and monorails.
		case 'NORMAL':
			return m.vehicle_bucket_normal();
		case 'DECORATIVE':
			return m.vehicle_bucket_decorative();
	}
}

/** Owner 0 is the game itself, which is what marks a vehicle as scenery. */
export function vehicleBucket(vehicle: DispatchVehicle): VehicleBucket {
	if (vehicle.ownerId === '0') return 'DECORATIVE';
	if (vehicle.category === 'SERVICE') return 'SERVICE';
	if (vehicle.category === 'STAFF') return 'STAFF';
	return 'NORMAL';
}

export function serviceStatusLabel(status: ServiceStatus): string {
	switch (status) {
		case 'AWAITING':
			return m.service_status_awaiting();
		case 'ENROUTE':
			return m.service_status_enroute();
		case 'ON_SCENE':
			return m.service_status_on_scene();
		case 'RETURNING':
			return m.service_status_returning();
	}
}

export const SERVICE_STATUS_ORDER: ServiceStatus[] = [
	'AWAITING',
	'ENROUTE',
	'ON_SCENE',
	'RETURNING'
];

/**
 * A colour per status, so a board reads at a glance without being read.
 *
 * Literal hues rather than theme tokens, because the Discord board paints the
 * same four and the two pictures have to agree — `src/bot/manifest.ts` holds
 * the matching copy.
 */
export const SERVICE_STATUS_COLORS: Record<ServiceStatus, string> = {
	AWAITING: '#8b949e',
	ENROUTE: '#f0883e',
	ON_SCENE: '#3fb950',
	RETURNING: '#4287f5'
};

/**
 * The `route` value meaning "this vehicle carries a written note instead".
 *
 * It lives in the same field as a route id because it occupies the same place
 * in a dispatcher's head: it is what this vehicle has been told to do. The
 * solver knows to leave it alone. Route ids are UUIDs, so nothing collides.
 */
export const NOTE_ROUTE = 'NOTE';

/** A vehicle type as group settings edits it. */
export type VehicleType = Data<ReturnType<ReturnType<Api['groups']>['vehicle-types']['get']>>[number];
