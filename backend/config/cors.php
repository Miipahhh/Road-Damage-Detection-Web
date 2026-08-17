<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://frontend-five-omega-60.vercel.app', // domain production
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
    'allowed_origins_patterns' => [
        '#^https://frontend-[a-z0-9]+-muhamad-pahmi\.vercel\.app$#', // preview deployment Vercel
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
