<?php
// db.php — shared database connection
// Reused by every endpoint via: require_once 'db.php';

$host = 'localhost';
$db   = 'ContactAppDB';
$user = 'ContactAppUser';
$pass = 'LampProjGroup36'; // TODO: move to an env variable / config file outside git before deploying
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode(['error' => 'Database connection failed']));
}
