# TripTailor - AI-Powered Travel Planning Platform

<div align="center">
  <img src="front/public/images/logo.png" alt="TripTailor Logo" width="200" height="200">
  
  **Your AI Travel Companion for Seamless Trip Planning**
  
  [![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://reactjs.org/)
  [![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange.svg)](https://aws.amazon.com/lambda/)
  [![DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-blue.svg)](https://aws.amazon.com/dynamodb/)
  [![Amadeus API](https://img.shields.io/badge/Amadeus-API-green.svg)](https://developers.amadeus.com/)
</div>

## 🌟 Overview

TripTailor is an intelligent travel planning platform that leverages AI to help users discover, plan, and book their perfect trips. The platform combines conversational AI with real-time flight and hotel search capabilities, providing a seamless experience from initial planning to final booking.

### Key Features

-   🤖 **AI-Powered Chat Interface**: Natural language conversation for trip planning
-   ✈️ **Real-Time Flight Search**: Integration with Amadeus API for live flight data
-   🏨 **Hotel Discovery**: Comprehensive hotel search with pricing and availability
-   📱 **Responsive Design**: Modern, mobile-first user interface
-   🔐 **Secure Authentication**: AWS Cognito integration for user management
-   💾 **Persistent Chat History**: Save and revisit your travel planning conversations
-   🎯 **Smart Recommendations**: AI-driven suggestions based on user preferences
-   📊 **Trip Management**: Organize flights and hotels in personalized trip cards

## 🏗️ Architecture

### Frontend (React + Vite)

-   **Framework**: React 19.0.0 with Vite for fast development
-   **Styling**: Tailwind CSS with custom components
-   **State Management**: React hooks and context
-   **Routing**: React Router DOM for navigation
-   **UI Components**: Custom component library with Material-UI integration
-   **Authentication**: AWS Cognito integration

### Backend (AWS Serverless)

-   **Compute**: AWS Lambda functions for serverless processing
-   **Database**: DynamoDB for data persistence
-   **API Integration**: Amadeus API for travel data
-   **Authentication**: AWS Cognito for user management
-   **Storage**: DynamoDB tables for chat history, user data, and travel information

### Key Lambda Functions

-   `handle_chat.py`: Main chat processing with OpenAI GPT-4 integration
-   `search_flights.py`: Flight search and booking functionality
-   `search_hotels.py`: Hotel search and booking functionality
-   `chat_management/`: User chat history and management
-   `user_management/`: User profile and authentication handling

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+ and npm
-   AWS CLI configured with appropriate permissions
-   Python 3.9+ (for Lambda functions)
-   AWS account with DynamoDB, Lambda, and Cognito access

### Frontend Setup

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd TripTailor
    ```

2. **Install dependencies**

    ```bash
    cd front
    npm install
    ```

3. **Environment Configuration**
   Create a `.env` file in the `front` directory:

    ```env
    VITE_HANDLE_CHAT_LAMBDA_URL=your_lambda_url
    VITE_GET_USER_CHATS_LAMBDA_URL=your_lambda_url
    VITE_SET_ACTIVE_CHAT_LAMBDA_URL=your_lambda_url
    VITE_DELETE_CHAT_LAMBDA_URL=your_lambda_url
    VITE_UPDATE_TRIP_CARD_LAMBDA_URL=your_lambda_url
    VITE_FETCH_TRIP_CARD_DATA_LAMBDA_URL=your_lambda_url
    VITE_GET_FLIGHTS_OFFERS_PRICE_LAMBDA_URL=your_lambda_url
    VITE_GET_HOTELS_OFFERS_PRICE_LAMBDA_URL=your_lambda_url
    VITE_GET_HOTELS_RATING_LAMBDA_URL=your_lambda_url
    VITE_CREATE_FLIGHT_ORDER_LAMBDA_URL=your_lambda_url
    VITE_BOOK_HOTEL_LAMBDA_URL=your_lambda_url
    VITE_FETCH_BOOKING_DATA_LAMBDA_URL=your_lambda_url
    VITE_REMOVE_FLIGHT_LAMBDA_URL=your_lambda_url
    VITE_REMOVE_HOTEL_LAMBDA_URL=your_lambda_url
    VITE_COGNITO_LOGIN_URL=your_cognito_login_url
    VITE_COGNITO_SIGNUP_URL=your_cognito_signup_url
    VITE_COGNITO_CLIENT_ID=your_cognito_client_id
    VITE_COGNITO_REDIRECT_URI=your_redirect_uri
    ```

4. **Start development server**

    ```bash
    npm run dev
    ```

5. **Build for production**
    ```bash
    npm run build
    ```

### Backend Setup

1. **AWS Infrastructure**

    - Set up DynamoDB tables: `chat-history`, `user`, `Flights`, `Hotels`, `ServiceTokens`
    - Configure AWS Cognito user pool
    - Deploy Lambda functions with appropriate IAM roles

2. **Lambda Dependencies**
   Each Lambda function includes its own `layers/python.zip` with required dependencies:

    - `boto3` for AWS SDK
    - `requests` for HTTP calls
    - `openai` for AI integration

3. **API Keys Configuration**
    - Amadeus API credentials in Lambda environment variables
    - OpenAI API key for chat functionality

## 📁 Project Structure

```
TripTailor/
├── front/                          # React frontend application
│   ├── src/
│   │   ├── Client/                 # Main application components
│   │   │   ├── Components/         # Reusable UI components
│   │   │   │   ├── chat/          # Chat interface components
│   │   │   │   ├── checkout/      # Booking and checkout components
│   │   │   │   ├── landing/       # Landing page components
│   │   │   │   ├── trips/         # Trip management components
│   │   │   │   └── ui/            # Base UI components
│   │   │   ├── Entities/          # Data models and business logic
│   │   │   ├── Layout.jsx         # Main application layout
│   │   │   └── Pages/             # Page components
│   │   ├── api/                   # API integration layer
│   │   └── utils/                 # Utility functions
│   ├── public/                    # Static assets
│   └── dist/                      # Production build output
├── lambdas/                       # AWS Lambda functions
│   ├── chat/                      # Chat processing
│   ├── chat_management/           # Chat history management
│   ├── search_flights/            # Flight search and booking
│   ├── search_hotels/             # Hotel search and booking
│   └── user_management/           # User profile management
└── README.md                      # This file
```

## 🔧 Key Technologies

### Frontend

-   **React 19.0.0**: Latest React with concurrent features
-   **Vite**: Fast build tool and development server
-   **Tailwind CSS**: Utility-first CSS framework
-   **Framer Motion**: Animation library
-   **React Router DOM**: Client-side routing
-   **Axios**: HTTP client for API calls
-   **Material-UI**: Component library
-   **Lucide React**: Icon library

### Backend

-   **AWS Lambda**: Serverless compute platform
-   **DynamoDB**: NoSQL database for data persistence
-   **AWS Cognito**: User authentication and management
-   **Python 3.9+**: Lambda runtime environment
-   **Boto3**: AWS SDK for Python
-   **OpenAI GPT-4**: AI chat functionality
-   **Amadeus API**: Travel data provider

## 🎯 Core Features

### 1. AI Chat Interface

-   Natural language processing for travel planning
-   Context-aware conversations with memory
-   Smart date parsing and location recognition
-   Personalized recommendations

### 2. Flight Search & Booking

-   Real-time flight availability and pricing
-   Multiple airline support
-   Flexible date and route options
-   Booking integration with Amadeus

### 3. Hotel Discovery

-   Comprehensive hotel search
-   Real-time pricing and availability
-   Rating and review integration
-   Booking management

### 4. Trip Management

-   Personalized trip cards
-   Flight and hotel organization
-   Booking history tracking
-   Easy modification and cancellation

### 5. User Experience

-   Responsive design for all devices
-   Smooth animations and transitions
-   Intuitive navigation
-   Fast loading and performance

## 🔐 Security & Authentication

-   **AWS Cognito**: Secure user authentication
-   **JWT Tokens**: Stateless authentication
-   **CORS Configuration**: Secure cross-origin requests
-   **Environment Variables**: Secure API key management
-   **IAM Roles**: Least privilege access control

## 🚀 Deployment

### Frontend Deployment

The frontend can be deployed to any static hosting service:

-   AWS S3 + CloudFront
-   Vercel
-   Netlify
-   GitHub Pages

### Backend Deployment

Lambda functions are deployed using:

-   AWS SAM (Serverless Application Model)
-   AWS CDK (Cloud Development Kit)
-   Serverless Framework
-   Manual ZIP upload via AWS Console

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   **Amadeus API** for comprehensive travel data
-   **OpenAI** for powerful AI capabilities
-   **AWS** for robust cloud infrastructure
-   **React Community** for excellent tooling and libraries

## 📞 Support

For support, email support@triptailor.com or join our Slack channel.

---

<div align="center">
  <p>Made with ❤️ by the TripTailor Team</p>
  <p>© 2024 TripTailor. All rights reserved.</p>
</div>
