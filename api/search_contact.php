<?php
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

// 405 error for invalid request method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request method, use GET']);
    exit;
}

// 400 error for invalid user ID
if (!isset($_GET['userId']) || !ctype_digit($_GET['userId'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user ID, a valid numeric userId is required.']);
    exit;
}

$userId = (int) $_GET['userId'];
$search = trim($_GET['search'] ?? '');

// cap the term
if (strlen($search) > 100) {
    $search = function_exists('mb_substr') ? mb_substr($search, 0, 100) : substr($search, 0, 100);
}

$columns = 'ID, FirstName, LastName, EmailAddress, PhoneNumber';

try {
    if ($search === '') {
        // no search term: return all of this user's contacts
        $stmt = $pdo->prepare(
            "SELECT $columns FROM Contacts
             WHERE UserID = :uid
             ORDER BY LastName, FirstName
             LIMIT 200"
        );
        $stmt->execute(['uid' => $userId]);
    } else {
        // escape % and _ so they're searched literally, then add the prefix wildcard
        $prefix = addcslashes($search, '\\%_') . '%';

        // search for contacts matching the search term
        $stmt = $pdo->prepare(
            "SELECT $columns FROM Contacts
             WHERE UserID = :uid
               AND (FirstName LIKE :p1
                    OR LastName LIKE :p2
                    OR CONCAT(FirstName, ' ', LastName) LIKE :p3
                    OR EmailAddress LIKE :p4
                    OR PhoneNumber LIKE :p5)
             ORDER BY LastName, FirstName
             LIMIT 200"
        );
        $stmt->execute([
            'uid' => $userId,
            'p1'  => $prefix,
            'p2'  => $prefix,
            'p3'  => $prefix,
            'p4'  => $prefix,
            'p5'  => $prefix,
        ]);
    }

    $results = $stmt->fetchAll();
    echo json_encode([
        'results' => $results,
        'count'   => count($results),
        'error'   => ''
    ]);
} catch (PDOException $e) {
    error_log('search_contact.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['results' => [], 'count' => 0, 'error' => 'Search failed']);
}