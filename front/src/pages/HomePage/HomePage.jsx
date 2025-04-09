import './HomePage.css';

export default function HomePage() {
    return (
        <div className="home-page">
            <header class="welcome">
                <div class="container">
                    <div class="logo-area">
                        <img
                            src="src/assets/images/logo.png"
                            alt="TripTailor Logo"
                            class="logo"
                        />
                    </div>
                    <h1 class="home-page-slogan">
                        Your personalized travel planning assistant.
                    </h1>
                    <div class="auth-buttons">
                        <button onclick="location.href='/signup'">
                            Sign Up
                        </button>
                        <button onclick="location.href='/signin'">
                            Sign In
                        </button>
                    </div>
                </div>
            </header>

            <section class="separator"></section>

            <section id="about" class="about">
                <div class="container">
                    <h2>Discover the Magic of TripTailor</h2>
                    <p>
                        TripTailor is your AI-powered travel companion,
                        revolutionizing the way you plan and book vacations.
                        Unlike traditional travel websites, TripTailor offers a
                        personalized, chat-based experience that instantly
                        curates flights, hotels, and attractions based on your
                        preferences. Simply enter your travel details, and our
                        cutting-edge AI will craft a tailor-made itinerary,
                        suggest hidden gems, and even assist with bookings—all
                        in one seamless experience. No more hours of
                        research—just effortless, customized travel planning
                        that feels like magic. Your dream vacation starts here!
                    </p>
                </div>
            </section>

            <section class="separator"></section>

            <section id="team" class="team">
                <div class="container">
                    <h2>Meet the Team</h2>
                    <div class="team-members">
                        <div class="team-member">
                            <img
                                src="src/assets/images/team1.jpg"
                                alt="Team Member 1"
                                class="team-photo"
                            />
                            <h3>John Doe</h3>
                            <p>
                                Founder & CEO. Passionate about travel and
                                technology.
                            </p>
                        </div>
                        <div class="team-member">
                            <img
                                src="src/assets/images/team2.jpg"
                                alt="Team Member 2"
                                class="team-photo"
                            />
                            <h3>Jane Smith</h3>
                            <p>
                                Lead Developer. Expert in building seamless user
                                experiences.
                            </p>
                        </div>
                        <div class="team-member">
                            <img
                                src="src/assets/images/team3.jpg"
                                alt="Team Member 3"
                                class="team-photo"
                            />
                            <h3>Emily Johnson</h3>
                            <p>
                                Marketing Specialist. Focused on connecting with
                                our users.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <footer class="footer">
                <div class="container">
                    <p>&copy; 2025 TripTailor. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
