
# Qus-Ai Backend

Qus-Ai a AI-Powered Question Generator's Backend.


## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file

```
# Server port(Optional)
PORT=8002

CORE_ORIGIN=*

# DB url
MONGODB_URL=YOUR_MONGODB_URL

# JWT Token
ACCESS_TOKEN_SECRET=YOUR_ACCESS_TOKEN_SECRET

ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=YOUR_REFRESH_TOKEN_SECRET

REFRESH_TOKEN_EXPIRY=90d

# Appwrite
APPWITE_PROJECT_ID=YOUR_APPWRITE_PROJECT_ID
APPWRITE_API_KEY=YOUR_APPWRITE_API_KEY

# Mail
RESEND_API_KEY=YOUR_RESEND_API_KEY

# AI
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY

# Payment Gatway
RAZORPAY_API_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_API_SECRET_KEY=YOUR_RAZORPAY_SECRET_KEY
RAZORPAY_WEBHOOK_SECRET=YOUR_RAZORPAY_WEBHOOK_SECRET

# FrontEnd Url
FRONTEND_URL=http://localhost:3000
```
## Installation

1. Clone the repository:

```bash
git clone https://github.com/Aurora0087/question-gen-backend.git
cd question-gen-backend
```

2. Install dependencies:

```bash
npm i
# or
bun i
```

3. Add environment variables to your `.env` file.

4. Start the development server:

```bash
npm run dev
# or
bun dev
```

5. In default server is Running on [http://localhost:8002](http://localhost:8002).
    
## API Reference

#### Register User

```http
  POST /api/v1/users/register
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `username` | `string` | **Required**. Your UserName |
| `email` | `string` | **Required**. Your Email Id |
| `password` | `string` | **Required**. Your Login Password |

#### Login User

```http
  POST /api/v1/users/login
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `email` | `string` | **Required**. Your Login Email Id |
| `password` | `string` | **Required**. Your Login Password |

#### Verify User Email

```http
  POST /api/v1/users/verify?token={token}&uId={uId}
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `token` | `string` | **Required**. A Unique Code |
| `uId` | `string` | **Required**. User Id |

#### Google Register/Login

```http
  POST /api/v1/users/auth/google
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `appwriteUserId` | `string` | **Required**. Appwrite Users Id |
| `provider` | `string` | **Required** |
| `email` | `string` | **Required**.Your Email Id |
| `name` | `string` | **Required**. UserName |

#### Refresh User's JWT

```http
  GET /api/v1/users/refreshToken
```

#### Send Email If User Forgot Password

```http
  POST /api/v1/users/email/forgotPassword
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `email` | `string` | **Required**. User Email Id |

#### Verify Forgot Password Email and Change Password

```http
  POST /api/v1/users/forgotPassword
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `token` | `string` | **Required**. A Unique Code |
| `email` | `string` | **Required**. User Email Id |
| `newPassword` | `string` | **Required**. User's New Password |


#### Logout user

```http
  Get /api/v1/users/logout
```

#### Send Email to Verify User Account

```http
  POST /api/v1/users/sendVerifyEmail
```

#### Change Current Logined Users Password

```http
  POST /api/v1/users/changePassword
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `oldPassword` | `string` | **Required** |
| `newPassword` | `string` | **Required** |
| `confirmPassword` | `string` | **Required** |

#### Change Current Logined Users UserName

```http
  POST /api/v1/users/changeUsername
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `newUsername` | `string` | **Required** |

#### Get Current Login User's Details

```http
  Get /api/v1/users/currentuser
```

#### Get Current Logined User's Credit Used History

```http
  POST /api/v1/users/currentuser/credit/history
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `page` | `number` | Which Page's Data you want |
| `limit` | `number` | How many Docs You want in response |

#### Generate MCQ Paper

```http
  POST /api/v1/chats/mcq/post
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `topic` | `string` | MCQ Paper Topic |
| `questionsQuantity` | `number` | How many Question you want to Generate |
| `topicPdf` | `file` | PDF file to Generate Questions |


#### Get Generated MCQ Papers from current login user

```http
  POST /api/v1/chats/mcq/current
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `page` | `number` | Which Page's Data you want |
| `limit` | `number` | How many Docs You want in response |


#### Search Generated MCQ Papers from current login user

```http
  POST /api/v1/chats/mcq/current
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `q` | `string` | Search Topic |

#### Get Generated MCQ Papers by mcq Id

```http
  POST /api/v1/chats/mcq
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `mcqId` | `string` | Mcq Paper Id |

#### Update MCQ Papers

```http
  POST /api/v1/chats/mcq/edit
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `mcqId` | `string` | Mcq Paper Id |
| `newTitle` | `string` | New Mcq paper's topic |

#### Delete MCQ Papers

```http
  POST /api/v1/chats/mcq/delete
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `mcqId` | `string` | Mcq Paper Id |

#### Post Mcqs Answers

```http
  POST /api/v1/chats/answer
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `mcqId` | `string` | Mcq Paper Id |
| `ans` | `array` | Answers |

#### Get Mcq's Answers

```http
  POST /api/v1/chats/answersByMcqId
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `mcqId` | `string` | Mcq Paper Id |
| `page` | `number` | Which Page's Data you want |
| `limit` | `number` | How many Docs You want in response |


#### Make a Razorpay Order

```http
  POST /api/v1/payment/razorpay/makeorder
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `orderedPackage` | `number` | Ordered Package's Index |
| `orderedPackageAmount` | `number` | Ordered Package's amount |
| `currency` | `string` | currency gonna use in payment |

#### Razorpay WebHook Url

```http
  POST /api/v1/payment/razorpay/webhook
```