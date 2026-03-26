from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import Base, engine

# Import routers
from routers import auth, blog, pricing, payments, content, contact, dashboard, ai_cv, ai_bio, ai_social, ai_link, ai_video, video_prompt_builder

# Create tables
Base.metadata.create_all(bind=engine)

# Create app
app = FastAPI(
    title="MyShortBIZ API",
    swagger_ui_parameters={"persistAuthorization": True}
)

# CORS (for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(blog.router)
app.include_router(pricing.router)
app.include_router(payments.router)
app.include_router(content.router)
app.include_router(contact.router)
app.include_router(dashboard.router)
app.include_router(ai_cv.router)
app.include_router(ai_bio.router)
app.include_router(ai_social.router)
app.include_router(ai_link.router)
app.include_router(ai_video.router)
app.include_router(video_prompt_builder.router)


@app.get("/")
def root():
    return {"message": "MyShortBIZ API running"}