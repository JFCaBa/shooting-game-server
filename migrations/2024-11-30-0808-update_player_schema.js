'use strict';

exports.up = function (next) {
	console.log('    --> This is migration 2024-11-30-0808-update_player_schema.js being applied');
	next();
};


exports.down = function (next) {
	console.log('    --> This is migration 2024-11-30-0808-update_player_schema.js being rollbacked');
	next();
};
