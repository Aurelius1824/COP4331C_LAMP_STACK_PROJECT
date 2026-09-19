<?php
// UserService.php — retrieval, creation, and deletion for the Users table
// Note: Password is hashed on create, and is intentionally excluded from
// every SELECT below. Never return password data through the API.
//
// IMPORTANT: run this once before using createUser(), since a proper
// password hash (60 chars) will not fit in the current varchar(50) column:
//   ALTER TABLE Users MODIFY Password VARCHAR(255) NOT NULL;

require_once __DIR__ . '/db.php';

/**
 * Get a single user by ID, without the password field.
 * Returns an associative array, or null if not found.
 */
function getUserById(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare(
        'SELECT ID, FirstName, LastName, Username, DateCreated, DateUpdated
         FROM Users
         WHERE ID = :id'
    );
    $stmt->execute(['id' => $id]);
    $result = $stmt->fetch();
    return $result ?: null;
}

/**
 * Get a single user by username, without the password field.
 * Returns an associative array, or null if not found.
 */
function getUserByUsername(PDO $pdo, string $username): ?array {
    $stmt = $pdo->prepare(
        'SELECT ID, FirstName, LastName, Username, DateCreated, DateUpdated
         FROM Users
         WHERE Username = :username'
    );
    $stmt->execute(['username' => $username]);
    $result = $stmt->fetch();
    return $result ?: null;
}

/**
 * Create a new user. Password is hashed with PHP's password_hash() (bcrypt)
 * before storage — the plain password is never written to the database.
 * Returns the newly created user's ID.
 *
 * Throws a RuntimeException if the username is already taken.
 */
function createUser(
    PDO $pdo,
    string $firstName,
    string $lastName,
    string $username,
    string $plainPassword
): int {
    if (getUserByUsername($pdo, $username) !== null) {
        throw new RuntimeException('Username already taken');
    }

    $hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        'INSERT INTO Users (FirstName, LastName, Username, Password, DateCreated, DateUpdated)
         VALUES (:firstName, :lastName, :username, :password, CURDATE(), CURDATE())'
    );
    $stmt->execute([
        'firstName' => $firstName,
        'lastName'  => $lastName,
        'username'  => $username,
        'password'  => $hashedPassword,
    ]);
    return (int) $pdo->lastInsertId();
}



/**
 * Update an existing user. Only the fields present in $fields are changed
 * (partial update) — allowed keys: firstName, lastName, username, password.
 * If 'password' is present it is re-hashed with password_hash() before
 * storage, just like createUser(). DateUpdated is always bumped to today.
 *
 * Returns true if the user exists and was updated, false if no matching
 * user existed (in which case nothing is written).
 *
 * Throws a RuntimeException if 'username' is present and already taken by
 * a different user.
 */
function updateUser(PDO $pdo, int $id, array $fields): bool {
    if (getUserById($pdo, $id) === null) {
        return false;
    }
 
    if (array_key_exists('username', $fields)) {
        $existing = getUserByUsername($pdo, $fields['username']);
        if ($existing !== null && (int) $existing['ID'] !== $id) {
            throw new RuntimeException('Username already taken');
        }
    }
 
    $columnMap = [
        'firstName' => 'FirstName',
        'lastName'  => 'LastName',
        'username'  => 'Username',
    ];
 
    $setParts = [];
    $params = ['id' => $id];
    foreach ($columnMap as $key => $column) {
        if (array_key_exists($key, $fields)) {
            $setParts[] = "$column = :$key";
            $params[$key] = $fields[$key];
        }
    }
 
    if (array_key_exists('password', $fields)) {
        $setParts[] = 'Password = :password';
        $params['password'] = password_hash($fields['password'], PASSWORD_DEFAULT);
    }
 
    if (empty($setParts)) {
        return true; // nothing to update, but the user does exist
    }
 
    $setParts[] = 'DateUpdated = CURDATE()';
    $sql = 'UPDATE Users SET ' . implode(', ', $setParts) . ' WHERE ID = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return true;
}


/**
 * Delete a user by ID, cascading to delete all of their contacts first.
 * Returns true if the user was deleted, false if no matching user existed
 * (in which case nothing is deleted, including contacts).
 *
 * Wrapped in a transaction: if either delete fails, both are rolled back.
 */
function deleteUser(PDO $pdo, int $id): bool {
    $pdo->beginTransaction();
    try {
        // Delete the user's contacts first
        $stmt = $pdo->prepare('DELETE FROM Contacts WHERE UserID = :userId');
        $stmt->execute(['userId' => $id]);

        // Then delete the user
        $stmt = $pdo->prepare('DELETE FROM Users WHERE ID = :id');
        $stmt->execute(['id' => $id]);
        $deleted = $stmt->rowCount() > 0;

        $pdo->commit();
        return $deleted;
    } catch (PDOException $e) {
        $pdo->rollBack();
        throw $e;
    }
}
