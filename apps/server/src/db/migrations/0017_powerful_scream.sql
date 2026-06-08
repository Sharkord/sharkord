ALTER TABLE `users` ADD `profile_theme` text DEFAULT '{"banner":{"type":"solid","colors":["#262626"]}}' NOT NULL;

UPDATE users
SET profile_theme =
    json_object(
        'banner',
        json_object(
            'type', 'solid',
            'colors', json_array(banner_color)
        )
    )
WHERE banner_color IS NOT NULL;

ALTER TABLE `users` DROP COLUMN `banner_color`;
