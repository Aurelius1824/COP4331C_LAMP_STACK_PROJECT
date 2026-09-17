<?php
// POST /create_user.php
// Body (JSON): { "firstName": "...", "lastName": "...", "username": "...", "password": "..." }
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/UserService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed, use POST']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$required = ['firstName', 'lastName', 'username', 'password'];
foreach ($required as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

if (strlen($input['password']) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 8 characters']);
    exit;
}

try {
    $newId = createUser(
        $pdo,
        $input['firstName'],
        $input['lastName'],
        $input['username'],
        $input['password']
    );
    http_response_code(201);
    echo json_encode(['id' => $newId, 'message' => 'User created']);
} catch (RuntimeException $e) {
    http_response_code(409);
    echo json_encode(['error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not create user']);
}
