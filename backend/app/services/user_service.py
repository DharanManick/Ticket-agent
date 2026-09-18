from typing import Dict, Any, Optional
from loguru import logger

class UserService:
    """Service handling persistent user profiles and theme preferences."""

    def __init__(self):
        self.profile: Dict[str, Any] = {
            "userId": "default_user",
            "name": "John Doe",
            "role": "Lead Audit Officer",
            "theme": "dark",
            "preferences": {}
        }

    def get_profile(self) -> Dict[str, Any]:
        return self.profile

    def update_profile(
        self,
        theme: Optional[str] = None,
        name: Optional[str] = None,
        role: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if theme and theme in ["dark", "light"]:
            self.profile["theme"] = theme
            logger.info(f"[UserProfile] Theme preference updated to '{theme}' in user profile")

        if name:
            self.profile["name"] = name
        if role:
            self.profile["role"] = role
        if preferences and isinstance(preferences, dict):
            self.profile["preferences"].update(preferences)

        return self.profile

user_service = UserService()
