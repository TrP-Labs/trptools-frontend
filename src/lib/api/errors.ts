import { m } from '$lib/paraglide/messages.js';

/**
 * Translations for the messages the API answers failures with.
 *
 * The backend declares every one of these as a `t.Literal` in its Elysia
 * models, and the frontend imports those models through Eden Treaty — so the
 * English sentence is already a stable, machine-readable error code and there
 * is nothing to change server-side to translate it. This table is keyed by
 * that sentence.
 *
 * `scripts/check-api-errors.mjs` reads the backend's own source and fails if a
 * literal is returned there that is missing here, so a reworded message cannot
 * quietly fall back to English for every language.
 *
 * A miss is not a failure, though: `apiErrorMessage` returns null and the
 * caller shows what the server said, which is always at least true.
 */
const API_ERRORS: Record<string, () => string> = {
	'Bad Request': m.api_error_bad_request,
	'Conflict': m.api_error_conflict,
	'Discord is not configured on this instance': m.api_error_discord_is_not_configured_on_this_instance,
	'Forbidden': m.api_error_forbidden,
	'Internal Server Error': m.api_error_internal_server_error,
	'Not Found': m.api_error_not_found,
	'Roblox OAuth is not configured': m.api_error_roblox_oauth_is_not_configured,
	'Too Many Requests': m.api_error_too_many_requests,
	'Unauthorized': m.api_error_unauthorized,
	'a depot with that number already exists': m.api_error_a_depot_with_that_number_already_exists,
	'a route with that name already exists': m.api_error_a_route_with_that_name_already_exists,
	'a vehicle cannot tow itself': m.api_error_a_vehicle_cannot_tow_itself,
	'already signed up for this shift': m.api_error_already_signed_up_for_this_shift,
	'answer every required question': m.api_error_answer_every_required_question,
	'api key cannot read this group': m.api_error_api_key_cannot_read_this_group,
	'bind a rank to this application before opening it': m.api_error_bind_a_rank_to_this_application_before,
	'built-in routes can be disabled but not deleted': m.api_error_built_in_routes_can_be_disabled_but,
	'could not reach roblox to check that key — try again shortly': m.api_error_could_not_reach_roblox_to_check_that,
	'group already exists': m.api_error_group_already_exists,
	'group does not exist': m.api_error_group_does_not_exist,
	'image uploads are not configured': m.api_error_image_uploads_are_not_configured,
	'invalid recurrence rule': m.api_error_invalid_recurrence_rule,
	'no bot is connected to this group': m.api_error_no_bot_is_connected_to_this_group,
	'program is not valid': m.api_error_program_is_not_valid,
	'rank already exists': m.api_error_rank_already_exists,
	'rank does not exist': m.api_error_rank_does_not_exist,
	'roblox is rate limiting that key — try again in a minute': m.api_error_roblox_is_rate_limiting_that_key_try,
	'roblox rejected that key — check it was copied whole and is not revoked': m.api_error_roblox_rejected_that_key_check_it_was,
	'sign-ups are not open for that shift yet': m.api_error_sign_ups_are_not_open_for_that,
	'site administrators cannot be suspended': m.api_error_site_administrators_cannot_be_suspended,
	'slug is unavailable': m.api_error_slug_is_unavailable,
	'that application does not exist': m.api_error_that_application_does_not_exist,
	'that file is not a supported image': m.api_error_that_file_is_not_a_supported_image,
	'that key belongs to the group — Roblox Open Cloud only accepts keys owned by a user account': m.api_error_that_key_belongs_to_the_group_roblox,
	'that record has already been cleared': m.api_error_that_record_has_already_been_cleared,
	'that slot is full': m.api_error_that_slot_is_full,
	'that vehicle is already being towed': m.api_error_that_vehicle_is_already_being_towed,
	'that vehicle is not in this room': m.api_error_that_vehicle_is_not_in_this_room,
	'this application has already been decided': m.api_error_this_application_has_already_been_decided,
	'this application is closed': m.api_error_this_application_is_closed,
	'this group already has a room open': m.api_error_this_group_already_has_a_room_open,
	'this shift is not running right now': m.api_error_this_shift_is_not_running_right_now,
	'two vehicles share a name': m.api_error_two_vehicles_share_a_name,
	'you already have an application waiting': m.api_error_you_already_have_an_application_waiting,
	'you already hold a rank above the one this form is for': m.api_error_you_already_hold_a_rank_above_the,
	'you cannot suspend your own account': m.api_error_you_cannot_suspend_your_own_account,
	'you have already reported this': m.api_error_you_have_already_reported_this,
	'your rank cannot take that slot': m.api_error_your_rank_cannot_take_that_slot,
};

/** The translation for an API failure message, or null if it is not one. */
export function apiErrorMessage(value: string): string | null {
	return API_ERRORS[value]?.() ?? null;
}
