![][image1]

Department of Computer Science and Engineering  
**Course:** CSE447: Cryptography and Cryptanalysis  
**Semester:** Summer 2026

**Project Report**

*Title:* **Connected – Secure Asymmetrically Encrypted Social Media & Identity Platform**

**Submitted To:** [Course Instructor Name]  
**Group No:** 01  

**Section:** 02  

**Submission Date:** September 2026  

**Group Members**

| No. | Full Name | Student ID |
| :---: | ----- | :---: |
| *1* | *Istiak Al Imran* | *22301040* |
| *2* | *[Member 2 Full Name]* | *[Member 2 Student ID]* |
| *3* | *[Member 3 Full Name]* | *[Member 3 Student ID]* |

---

# **Table of Contents**

1.  Introduction and System Overview	3
2.  Login and Registration Module	4
3.  User Data Encryption and Decryption	5
4.  Password Hashing and Salting	6
5.  Two-Factor Authentication (2FA)	7
6.  Key Management Module	8
7.  Post and Profile Management	9
8.  Data Storage Security	10
9.  Message Authentication Code (MAC)	11
10. Role-Based Access Control (RBAC)	12
11. Secure Session Management	13
12. GitHub Repository and Project Structure	14
13. Conclusion	15

---

# **1. Introduction and System Overview**

This report documents the design and implementation of our CSE447 Lab Project, named **Connected**. The system is a secure web application that implements all cryptographic protocols specified in the course requirements. In strict accordance with the lab rules, all encryption algorithms, hashing, and MAC functions were written from scratch using first principles without relying on built-in language or framework cryptographic wrappers.

### **1.1 Project Overview**

Most web applications store user data in plaintext or rely on symmetric ciphers (such as AES) where a compromised shared key exposes all stored records. Our project, **Connected**, is a social networking platform designed with zero-trust principles:

- **Exclusively Asymmetric Encryption:** Symmetric ciphers (AES, DES, etc.) are completely forbidden and not used anywhere in the codebase.
- **Dual Asymmetric Cryptosystems:** We implemented two separate public-key systems:
  1. **RSA (Algorithm 1):** Used to encrypt user personal credentials and profile details (username, email, full name, address).
  2. **ECC (Algorithm 2):** Used to encrypt social posts, feeds, and messaging payloads using secp256k1 curve arithmetic.
- **From-Scratch Primitives:** Every algorithm (RSA, ECC, SHA-256, HMAC, and salted password hashing) was built using native JavaScript `BigInt` operations without using Node's `crypto.createCipheriv` or external cipher packages.
- **Full Security Features:** The application includes a Key Management Module (KMM) with key rotation, email-based Two-Factor Authentication (2FA), Message Authentication Codes (MAC) for database tamper detection, Role-Based Access Control (RBAC), and session anti-hijacking based on browser fingerprinting.

### **1.2 Technology Stack**

- **Language & Runtime:** JavaScript (ES6+) on Node.js (v18+/v20+), using native `BigInt` for large-number math.
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide React icons.
- **Backend:** Next.js Server Components and API Route Handlers (`/api/*`).
- **Database:** MongoDB with Mongoose ODM for storing encrypted documents and blind index hashes.
- **Email Service:** Nodemailer for sending signup email verification codes and 2FA login OTPs.
- **Real-Time Service:** Socket.io client and messaging server for live peer-to-peer messaging.
- **Crypto Libraries:** **None.** No external crypto or built-in cipher APIs were used. All cryptographic operations were coded in `src/lib/crypto/`.

### **1.3 System Architecture Diagram**

```
+-------------------------------------------------------------------------------+
|                           CLIENT LAYER (Next.js 15)                          |
|    Signup / Signin (2FA)  |  Encrypted Feed & Editor  |  Admin Dashboard      |
+-------------------------------------------------------------------------------+
                                       │
                                       ▼ (HTTPS / JSON)
+-------------------------------------------------------------------------------+
|                         API GATEKEEPER & RBAC MIDDLEWARE                      |
|      /api/auth/*   |   /api/posts/*   |   /api/profile   |   /api/kmm         |
|             [ Session Anti-Hijacking Validator (HMAC + Fingerprint) ]         |
+-------------------------------------------------------------------------------+
                                       │
                                       ▼
+-------------------------------------------------------------------------------+
|                     FROM-SCRATCH CRYPTOGRAPHY ENGINE                          |
|  - RSA Engine: Miller-Rabin, modPow, Extended GCD, 30-byte chunking           |
|  - ECC Engine: secp256k1 curve, Point Add/Double, Scalar Multiply, ElGamal   |
|  - Hash Engine: 64-round SHA-256, 5000-round Salted Password Hashing          |
|  - MAC Engine: RFC 2104 HMAC-SHA256 for payload integrity                     |
|  - KMM Engine: Key generation, master keystream masking, versioned rotation   |
+-------------------------------------------------------------------------------+
                                       │
                                       ▼
+-------------------------------------------------------------------------------+
|                          MONGODB ENCRYPTED STORAGE                            |
|  Users (RSA Ciphertext) | Posts (ECC Ciphertext + MAC) | KeyStore (Protected) |
+-------------------------------------------------------------------------------+
```

---

# **2. Login and Registration Module**

Our system provides secure registration and login with input validation, zero-plaintext storage, and two-step verification.

### **2.1 Registration Flow**

1. **Input Submission:** The user enters their `username`, `email`, `password`, `fullName`, and `address`.
2. **Blind Index Hashes:** To prevent duplicate usernames or emails without keeping plaintext in the database, we compute deterministic SHA-256 hashes:
   $$\text{emailHash} = \text{SHA256}(\text{"blind\_index\_salt:"} + \text{email.toLowerCase()})$$
   $$\text{usernameHash} = \text{SHA256}(\text{"blind\_index\_salt:"} + \text{username.toLowerCase()})$$
3. **Uniqueness Check:** The database checks for existing records matching `emailHash` or `usernameHash`.
4. **Salted Password Hashing:** A random 16-byte (32 hex character) salt is generated. The password is hashed using 5,000 recursive rounds of our custom SHA-256.
5. **RSA Encryption:** The system retrieves the active RSA public key $(e, n)$ from KMM. The user's `username`, `email`, `fullName`, and `address` are split into 30-byte blocks and encrypted using $c = m^e \pmod n$.
6. **Email Verification Code:** A random 6-digit verification code is generated, set to expire in 15 minutes, and emailed to the user via Nodemailer.
7. **Storage:** The record is saved in MongoDB with `emailVerified: false`. The user cannot log in until they verify their email.

### **2.2 Login Flow**

1. **Credential Check (Step 1):** The user enters their email/username and password. The server finds the account via the blind index hash and computes the 5,000-round salted hash of the submitted password. If it matches and the email is verified, Step 1 succeeds.
2. **2FA Challenge Generation:** The server generates a random 6-digit OTP code, stores it in `user.twoFactorTempCode` with a 5-minute expiration timestamp, decrypts the user's email using scratch RSA, and emails the code via Nodemailer. The client is prompted with a 2FA modal.
3. **2FA Verification (Step 2):** The user submits the 6-digit code to `/api/auth/verify-2fa`. If valid and unexpired, the code is cleared immediately to prevent replay.
4. **Session Token Issuance:** The server creates a session payload, binds it to the client's environmental fingerprint (hash of User-Agent and IP), signs it with custom HMAC-SHA256, and sends it back to the client.

### **2.3 Implementation Details**

| Requirement | Implementation Details |
| :--- | :--- |
| **Login Module** | Two-step authentication: Step 1 checks primary credentials against a 5,000-round custom SHA-256 salted hash. Step 2 requires a time-limited 6-digit email OTP sent through Nodemailer. |
| **Registration Module** | Captures credentials, checks uniqueness via blind index hashes, hashes the password with a 128-bit salt, encrypts all PII using scratch RSA, and dispatches an email verification code. |
| **Data Encrypted Before Storage** | `username`, `email`, `fullName`, and `address` are encrypted using Scratch RSA ($e=65537$, 512-bit modulus). Post contents are encrypted using Scratch ECC. Private keys are encrypted using a master KMM keystream. |
| **Data Decrypted on Retrieval** | In authenticated endpoints (`/api/profile`, `/api/posts`), the server fetches the corresponding private key version from KMM and decrypts data in memory before returning the response. |

---

# **3. User Data Encryption and Decryption**

### **3.1 Fields Encrypted**

| Collection | Field Name | Encryption Algorithm | Key Scheme / Parameters | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `User` | `username` | **Scratch RSA** | 512-bit modulus ($n = p \cdot q$), $e = 65537$ | User handle privacy |
| `User` | `email` | **Scratch RSA** | 512-bit modulus ($n = p \cdot q$), $e = 65537$ | Communication address |
| `User` | `fullName` | **Scratch RSA** | 512-bit modulus ($n = p \cdot q$), $e = 65537$ | Real identity privacy |
| `User` | `address` | **Scratch RSA** | 512-bit modulus ($n = p \cdot q$), $e = 65537$ | Location privacy |
| `User` | `password` | **Scratch Salted Hash** | 5,000 rounds custom SHA-256 + 128-bit salt | Credential protection |
| `Post` | `content` | **Scratch ECC** | secp256k1 curve ($y^2 = x^3 + 7$), ElGamal | Social feed content |
| `KeyStore` | `encryptedPrivateKey`| **KMM Stream Mask** | Dynamic keystream from `MASTER_KMM_SECRET` | Private key storage |

### **3.2 Encryption Algorithm - RSA Implementation**

Our RSA implementation is written from scratch in `src/lib/crypto/rsa.js`:

1. **Prime Generation:** Generates two 256-bit prime candidates $p$ and $q$ using randomized offsets over safe prime bases, verified with an 8-round **Miller-Rabin primality test**.
2. **Key Computation:** Modulus $n = p \times q$ (512 bits) and Euler totient $\phi(n) = (p-1)(q-1)$. Public exponent is $e = 65537$. Private exponent $d$ is computed using the **Extended Euclidean Algorithm** (`modInverse`) such that $d \cdot e \equiv 1 \pmod{\phi(n)}$.
3. **Modular Exponentiation (`modPow`):** Uses binary exponentiation (square-and-multiply) with `BigInt` bit-shifts to compute $c \equiv m^e \pmod n$ in $O(\log e)$ time.
4. **Chunking for Arbitrary Text:** Because RSA can only encrypt values smaller than $n$, strings are converted to UTF-8 bytes and sliced into **30-byte chunks** (240 bits, strictly below our 512-bit modulus). Each chunk is converted to a `BigInt` and encrypted. Ciphertext is stored as `version:RSA:chunk1Hex.len1:chunk2Hex.len2:...`. Decryption reverses this: $m = c^d \pmod n$, converts `BigInt` back to bytes, and decodes with `TextDecoder`.

### **3.3 Encryption Algorithm - ECC Implementation**

Our ECC implementation is written in `src/lib/crypto/ecc.js`:

1. **Curve Parameters:** Standard Weierstrass curve secp256k1:
   $$y^2 \equiv x^3 + 7 \pmod p$$
   where $p = 2^{256} - 2^{32} - 977$, with generator point $G = (G_x, G_y)$ and order $n$.
2. **Point Operations:**
   - **Point Addition ($P \neq Q$):** Slope $\lambda = (y_2 - y_1) \cdot (x_2 - x_1)^{-1} \pmod p$, $x_3 = \lambda^2 - x_1 - x_2 \pmod p$, $y_3 = \lambda(x_1 - x_3) - y_1 \pmod p$.
   - **Point Doubling ($P = Q$):** Slope $\lambda = (3x_1^2) \cdot (2y_1)^{-1} \pmod p$, $x_3 = \lambda^2 - 2x_1 \pmod p$, $y_3 = \lambda(x_1 - x_3) - y_1 \pmod p$.
   - **Scalar Multiplication:** Double-and-Add algorithm computing $k \cdot P$ in $O(\log k)$ steps.
3. **Asymmetric ElGamal Encryption:**
   - Public key point $Q = d_B \cdot G$, private scalar $d_B$.
   - Sender chooses a random ephemeral scalar $k$ and computes ephemeral point $C_1 = k \cdot G$ and shared secret point $S = k \cdot Q$.
   - The x-coordinate $S_x$ is fed into our scratch SHA-256 Key Derivation Function (KDF) to produce a keystream equal to the message length.
   - Ciphertext byte stream is $C_2 = M \oplus \text{keystream}$. Stored as `ECC:C1_x.C1_y:C2_hex`.
   - The recipient recovers $S = d_B \cdot C_1 = k \cdot Q$, derives the same keystream, and unmasks $M$.

### **3.4 How Both Algorithms Are Used Differently**

To satisfy the requirement that at least two distinct asymmetric ciphers are used:
- **Scratch RSA** protects static identity information and user profiles (`username`, `email`, `fullName`, `address`).
- **Scratch ECC** protects dynamic, high-frequency social content (posts and comments). ECC provides 256-bit security with smaller keys and faster point operations, which is ideal for social feeds.
- Neither AES nor any symmetric cipher is used anywhere.

---

# **4. Password Hashing and Salting**

### **4.1 Hashing Algorithm Used**

We implemented **SHA-256 (FIPS PUB 180-4)** from first principles in `src/lib/crypto/sha256.js`. It includes 512-bit message padding, the 64-round compression loop, 64 round constants $K[0..63]$, logical functions ($\text{Ch}, \text{Maj}, \Sigma_0, \Sigma_1, \sigma_0, \sigma_1$), and initial working variables $h_0 \dots h_7$.

### **4.2 Salt Generation**

The salt is generated using `generateSalt(16)`, which creates a random 32-character hexadecimal string (128 bits of entropy). Each user has a unique salt stored in their `salt` field in MongoDB, preventing rainbow-table attacks.

### **4.3 Verification Process**

We use 5,000 iterations of SHA-256 to slow down brute-force attacks:
$$D_0 = \text{SHA256}(\text{salt} + \text{":"} + \text{password})$$
$$D_i = \text{SHA256}(D_{i-1} + \text{":"} + \text{salt} + \text{":"} + i) \quad (i = 1 \dots 4999)$$
On login, the server retrieves the user's stored salt, runs the exact 5,000-round function with the entered password, and compares the resulting digest with the stored password hash.

---

# **5. Two-Factor Authentication (2FA)**

### **5.1 2FA Method**

We enforce Two-Factor Authentication using **Email One-Time Passcodes (OTP)**:
1. When primary credentials pass validation, the server creates a random 6-digit code:
   $$\text{code} = \lfloor 100000 + \text{random}() \times 900000 \rfloor$$
2. The code is saved to `user.twoFactorTempCode` with a 5-minute expiry in `user.twoFactorExpires`.
3. The server decrypts the user's registered email using scratch RSA and sends the code via Nodemailer.
4. The user submits the code on the screen. Once verified, the temporary code is set to `null` and a signed session token is granted.

### **5.2 Code Snippet**

From `/api/auth/login/route.js`:
```javascript
// Step 1: Verify primary credentials
const isMatch = await comparePassword(password, user.password, user.salt);
if (!isMatch) return NextResponse.json({ message: 'Invalid credentials.' }, { status: 400 });

// Step 2: Generate time-limited 6-digit OTP
const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
user.twoFactorTempCode = twoFactorCode;
user.twoFactorExpires = new Date(Date.now() + 5 * 60 * 1000);
await user.save();

// Decrypt user email via Scratch RSA and send email
const decryptedEmail = await decryptUserField(user.email);
const decryptedUsername = await decryptUserField(user.username);
await sendTwoFactorEmail(decryptedEmail, decryptedUsername, twoFactorCode);

return NextResponse.json({ require2FA: true, userId: user._id.toString() });
```

---

# **6. Key Management Module**

### **6.1 Key Storage Security**

The Key Management Module (`src/lib/crypto/kmm.js`) manages asymmetric keypairs using the `KeyStore` collection:
- Public keys are stored in plaintext JSON for lookup and distribution.
- Private keys are never stored in plaintext. They are XOR-encrypted before database persistence using a keystream derived from `MASTER_KMM_SECRET` via SHA-256 blocks.
- Active keys are cached in memory with a 60-second TTL to avoid decrypting the master key on every single request.

### **6.2 Key Rotation Policy**

Key versions are tagged sequentially (`v1`, `v2`, ...):
1. An administrator clicks **"Trigger KMM Key Rotation"** on the Admin Dashboard (`POST /api/kmm`).
2. Current active keys are set to `isActive: false` with a `rotatedAt` timestamp.
3. Fresh RSA and ECC keypairs are generated and stored as active with the incremented version number (`v2`).
4. **Backward Compatibility:** All existing posts and profiles retain their version prefix (e.g., `keyVersion: "v1"`). The function `getKeyByVersion(algorithm, version)` retrieves the appropriate historical private key, so existing data remains readable without needing mass database re-encryption.

---

# **7. Post and Profile Management**

### **7.1 Post Module**

- **Create Post (`POST /api/posts`):** The post text is encrypted using the active **Scratch ECC** public key. An HMAC-SHA256 signature is calculated over `ciphertext + authorId + timestamp` and saved alongside the active key version.
- **Read Feed (`GET /api/posts`):** For each post, the server verifies the HMAC signature. The content is decrypted using the matching versioned ECC private key, and the author's username is decrypted using RSA.
- **Edit Post (`PUT /api/posts/[id]`):** The author or an admin can edit a post. The updated text is re-encrypted with the active ECC key, and a new MAC signature is generated.
- **Delete Post (`DELETE /api/posts/[id]`):** Allows the post author or an administrator to delete the post.

### **7.2 Profile Module**

- **View Profile (`GET /api/profile`):** Decrypts the user's `username`, `email`, `fullName`, and `address` using their versioned Scratch RSA private key.
- **Update Profile (`PUT /api/profile`):** The user can update their `fullName` and `address`. The updated fields are immediately re-encrypted with the active Scratch RSA public key and saved.

### **7.3 Screenshots and UI Layouts**

```
+-------------------------------------------------------------------------------+
| CONNECTED      [Posts (ECC)]   [Profile (RSA)]   [Admin & KMM]   [Logout]     |
+-------------------------------------------------------------------------------+
|  CREATE POST                                                                  |
|  [ Write post content (Encrypted via Scratch ECC secp256k1)...             ] |
|  [ Publish Post ]                                                             |
|                                                                               |
|  FEED                                                                         |
|  +-------------------------------------------------------------------------+  |
|  | @IstiakImran  •  Sep 6, 2026       [Key: v1]  [✔ MAC Verified]           |  |
|  | Cipher: ECC:79be667e...:3f8a91c0e4...                                   |  |
|  | "Our project implements dual asymmetric encryption from scratch."       |  |
|  | [▲ 5] [▼ 0] [3 Comments]  [Edit Post]  [Delete]                          |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```
*Figure 7.1: Post feed displaying ECC decrypted content, active key version, and HMAC integrity badge.*

```
+-------------------------------------------------------------------------------+
| USER PROFILE (Scratch RSA Protected)                     [Edit Profile]       |
+-------------------------------------------------------------------------------+
|   Username:   IstiakImran          | Full Name: Istiak Al Imran               |
|   Email:      istiak@example.com   | Address:   Dhaka, Bangladesh             |
|   Role:       Admin                | 2FA:       Enabled (Email OTP)           |
+-------------------------------------------------------------------------------+
```
*Figure 7.2: Profile management page showing decrypted details and edit option.*

---

# **8. Data Storage Security**

All sensitive user information, post contents, and private keys are stored in encrypted format.

### **8.1 Evidence of Encrypted Storage**

#### **1. User Document (`users` collection in MongoDB):**
```json
{
  "_id": "66d9f821a4bc1023d810a901",
  "username": "v1:RSA:4a12ec98b030d93fe...11:2f77890a...2",
  "usernameHash": "a823f66904bc7102e3398df991bc402830f6b3e9a11029c381f92e3178ab610a",
  "email": "v1:RSA:7c9810a34ef2890b...18:338fa910...4",
  "emailHash": "9b12847a9823ef0021cbb8912304918237498217349128374918237498123749",
  "fullName": "v1:RSA:88390fca10293847...15",
  "address": "v1:RSA:1928374650192837...17",
  "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  "salt": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  "role": "admin",
  "emailVerified": true,
  "twoFactorEnabled": true
}
```

#### **2. Post Document (`posts` collection in MongoDB):**
```json
{
  "_id": "66d9fa90b4bc1023d810b102",
  "author": "66d9f821a4bc1023d810a901",
  "content": "ECC:79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798.483ada7726a3c4655da4fbf00e1108a8fd17b448a68554199c47d08ffb10d4b8:a9f8b2c1409d8e7230498bf7102983746cba09182374",
  "keyVersion": "v1",
  "mac": "88ef2091bc74019a823b47c91028374659102837465910283746591028374659",
  "createdAt": "2026-09-06T10:20:00.000Z"
}
```

---

# **9. Message Authentication Code (MAC)**

### **9.1 MAC Algorithm Used**

We implemented **HMAC-SHA256 (RFC 2104)** from scratch in `src/lib/crypto/mac.js`:
$$\text{HMAC}(K, m) = \text{SHA256}((K \oplus opad) \parallel \text{SHA256}((K \oplus ipad) \parallel m))$$
where block size is 64 bytes, $ipad = \text{0x36}$ repeated 64 times, and $opad = \text{0x5c}$ repeated 64 times. If key length exceeds 64 bytes, it is hashed first.

### **9.2 Integrity Verification Flow**

1. **Generation:** When a post is saved, an integrity payload is constructed: `ciphertext + ":" + authorId + ":" + timestamp`. The MAC is generated with `generateMAC(MAC_SECRET, payload)` and stored with the post.
2. **Verification:** When posts are read, the server recalculates the MAC and verifies it using constant-time string comparison (`verifyMAC`) to prevent timing attacks.
3. **Tamper Alert:** If someone modifies the ciphertext directly in MongoDB, the MAC check fails, and the post displays an **"Integrity Failed / Tamper Alert"** badge.

---

# **10. Role-Based Access Control (RBAC)**

### **10.1 Roles Defined**

1. **Regular User (`user`):** Can register, verify email, log in with 2FA, create posts, edit/delete their own posts, view/update their own profile, and vote/comment.
2. **Administrator (`admin`):** Has all user privileges plus access to `/admin`, permission to trigger KMM key rotation, view key rotation history, manage all registered users, promote/demote roles, delete user accounts, and moderate/delete any post.

### **10.2 Permission Matrix**

| Operation / Feature | Regular User | Administrator |
| :--- | :---: | :---: |
| View own decrypted profile | ✔ | ✔ |
| Edit own profile (RSA re-encryption) | ✔ | ✔ |
| Create posts (ECC encryption & MAC signing) | ✔ | ✔ |
| Edit own posts | ✔ | ✔ |
| Delete own posts | ✔ | ✔ |
| Moderate / delete any post | ✘ | ✔ |
| Access Admin Dashboard (`/admin`) | ✘ | ✔ |
| Trigger KMM Key Rotation | ✘ | ✔ |
| View KMM rotation audit logs | ✘ | ✔ |
| View all user accounts | ✘ | ✔ |
| Change user roles (`user` $\leftrightarrow$ `admin`) | ✘ | ✔ |
| Delete user accounts | ✘ | ✔ |

---

# **11. Secure Session Management**

### **11.1 Token Signing / Verification and Anti-Hijacking**

Authentication tokens are managed in `src/lib/crypto/session.js`:
1. **Format:** URL-safe Base64 payload signed with custom HMAC-SHA256:
   $$\text{Token} = \text{Payload}_{\text{Base64Url}} + \text{"."} + \text{HMAC}(\text{SESSION\_KEY}, \text{Payload}_{\text{Base64Url}})$$
2. **Payload:** Contains `userId`, `role`, issue time, expiry (24 hours), and an environmental fingerprint:
   $$\text{fingerprint} = \text{SHA256}(\text{User-Agent} + \text{"::"} + \text{Client IP})$$
3. **Anti-Hijacking Defense:** On each protected request, the server recalculates the client's current User-Agent and IP hash. If an attacker steals the token and attempts to replay it from a different browser or network, the mismatch triggers a **Session Hijacking Detected** error and access is revoked immediately.

---

# **12. GitHub Repository and Project Structure**

| Field | Details |
| :--- | :--- |
| **GitHub Repository URL** | [https://github.com/IstiakImran/connected](https://github.com/IstiakImran/connected) |

### **12.1 Repository Structure**

```
connected/
├── src/
│   ├── app/
│   │   ├── (auth)/signin/page.jsx      # Login UI with 2FA Challenge Modal
│   │   ├── (auth)/signup/page.jsx      # Signup UI with RSA Encryption
│   │   ├── admin/page.jsx              # Admin Dashboard: KMM Rotation, RBAC, Post Moderation
│   │   ├── api/
│   │   │   ├── admin/users/route.js    # Admin RBAC & User Management API
│   │   │   ├── auth/login/route.js     # Step 1 Auth & 2FA OTP Dispatch
│   │   │   ├── auth/verify-2fa/route.js# Step 2 Auth & Anti-Hijacking Token Generation
│   │   │   ├── auth/signup/route.js    # Registration API with Blind Index
│   │   │   ├── kmm/route.js            # Key Distribution & Rotation Endpoint
│   │   │   ├── posts/route.js          # ECC Encrypted Post Feed & HMAC Check
│   │   │   ├── posts/[id]/route.js     # Post Edit (Re-encryption) & Delete
│   │   │   └── profile/route.js        # RSA Profile View & Edit API
│   │   ├── components/Navbar.jsx       # Navigation with Role Badges & Notifications
│   │   ├── posts/page.jsx              # Feed with Inline Post Editing & MAC Badges
│   │   └── profile/page.jsx            # Profile View & Edit Modal
│   ├── lib/
│   │   ├── crypto/
│   │   │   ├── sha256.js               # Pure Scratch SHA-256 (FIPS PUB 180-4)
│   │   │   ├── rsa.js                  # Algorithm 1: Pure Scratch RSA (BigInt)
│   │   │   ├── ecc.js                  # Algorithm 2: Pure Scratch ECC (secp256k1)
│   │   │   ├── hash.js                 # 5000-Round Salted Password Hasher
│   │   │   ├── mac.js                  # Scratch HMAC-SHA256 (RFC 2104)
│   │   │   ├── kmm.js                  # Key Management Module (Keystore & Rotation)
│   │   │   └── session.js              # Anti-Hijacking Session & Fingerprint Engine
│   │   ├── auth.js                     # Unified Authentication Facade
│   │   ├── encryption.js               # Dual Asymmetric Encryption Facade
│   │   ├── dbConnect.js                # MongoDB Connection Handler
│   │   └── mailer.js                   # Nodemailer OTP Dispatch Service
│   └── schema/
│       ├── KeyStore.js                 # KMM Key Versions Schema
│       ├── Posts.js                    # Posts Schema with ECC Ciphertext & MAC
│       └── User.js                     # User Schema with RSA Ciphertext & Blind Indexes
├── messaging-server/                   # Socket.io Messaging Server
├── README.md                           # Setup & Running Instructions
└── package.json
```

### **12.2 README Overview**

The project README details:
1. **Prerequisites:** Node.js 18+ and a running MongoDB instance.
2. **Configuration:** Setting up `.env.local` with `MONGODB_URI`, `MASTER_KMM_SECRET`, `MAC_SECRET`, `SESSION_SIGNING_KEY`, and SMTP credentials for Nodemailer.
3. **Commands:**
   - `npm install`: Installs required packages.
   - `npm run dev`: Runs the Next.js local development server on `http://localhost:3000`.
   - `npm run build`: Validates and compiles the production bundle.

---

# **13. Conclusion**

In this project, we successfully built **Connected**, an end-to-end secure social media platform that meets all requirements of the CSE447 Lab. We completely eliminated symmetric encryption, successfully implementing two separate asymmetric algorithms from scratch: RSA for user credentials/profile data and ECC (secp256k1) for posts and social feeds. 

Building big-integer modular arithmetic, point multiplication, SHA-256, and HMAC from first principles deepened our understanding of cryptographic engineering. Integrating versioned key rotation, email-based 2FA, data integrity checks, and session anti-hijacking allowed us to create a practical, defense-in-depth web application.

[image1]: <data:image/png;base64,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>