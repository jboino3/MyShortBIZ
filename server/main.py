from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import router as AuthRouter
from routers.contact import router as ContactRouter
from routers.pricing import router as PricingRouter
from routers.payments import router as PaymentsRouter
from routers.content import router as ContentRouter
from routers.blog import router as BlogRouter

from db import Base, engine
import models  # noqa: F401  (make sure models are imported so metadata is populated)

app = FastAPI(
    title="MyShortBIZ API",
    swagger_ui_parameters={"persistAuthorization": True},  # keep token across refreshes
)

# Create all tables
Base.metadata.create_all(bind=engine)

# CORS for frontend
origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "MyShortBIZ API is running", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MyShortBIZ"}


# ----- Mount Routers -----

app.include_router(AuthRouter)
app.include_router(ContactRouter)
app.include_router(PricingRouter)
app.include_router(PaymentsRouter)
app.include_router(ContentRouter)
app.include_router(BlogRouter)
