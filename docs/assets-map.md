# Main Application — Profile Workspace

## Location

design-assets/Main Page/Profile/

## Official UI References

### Profile-header-reference.png

Purpose:

Official reference for the Profile Overview section.

This reference defines the approved Profile landing experience inside the STRUCTRA application.

Use it to reproduce:

- Profile header glass card
- User avatar
- User information
- Premium plan badge
- Member since section
- Edit Profile button
- Quick overview cards
- Account status
- Storage usage
- Documents uploaded
- Last login
- Secure data information card
- Glassmorphism
- Typography
- Spacing
- Borders
- Glow effects
- Visual hierarchy

---

### personal-info-reference.png

Purpose:

Official reference for the Personal Information section.

This reference defines how users manage and update their personal details.

Recreate the approved UI including:

- Personal information form
- Full name
- Email address
- Phone number
- Organization
- Job title
- Location
- Profile picture management
- Change profile picture
- Remove profile picture
- Preferred language
- Verified email badge
- Edit mode
- Save Changes
- Cancel
- Premium STRUCTRA styling

---

### Account-security-reference.png

Purpose:

Official reference for the Account & Security section.

This screen manages authentication, account recovery, passwords and active sessions.

Use the reference to reproduce:

- Sign-in method
- Google Account login
- Email & Password login
- Active authentication method
- Password management
- Change password
- Account recovery
- Recovery email
- Recovery phone
- Active sessions
- Current device
- Other signed-in devices
- Manage sessions
- Security activity
- Recent login activity
- Glass cards
- Orange accent buttons
- Premium dark UI

IMPORTANT:

The UI must support both authentication methods.

**Google Account**

- Show Google Account as the active sign-in method.
- Do NOT display password creation for Google-only users.
- Password section should be hidden when the account is Google-only.

**Email & Password Account**

- Show Email & Password as the active sign-in method.
- Display Change Password.
- Display Account Recovery.
- Display Active Sessions.
- Display Security Activity.

The interface should automatically adapt based on the user's authentication provider.

---

### danger-zone-reference.png

Purpose:

Official reference for the Danger Zone section.

This screen manages permanent account deletion.

Recreate:

- Danger Zone warning header
- Permanent deletion warning
- Information about what will be deleted
- Uploaded documents
- Extracted information
- AI conversations
- Account settings
- Usage history
- Confirmation warning card
- DELETE confirmation input
- Delete Account button
- Cancel button
- Premium warning styling
- Red danger accents
- Glassmorphism
- Dark STRUCTRA visual language

---

# Profile Workspace

The Profile section is a dedicated account-management workspace inside the existing STRUCTRA application.

It contains **four mini sections**:

1. Profile
2. Personal Information
3. Account & Security
4. Danger Zone

These sections should switch inside the same workspace without navigating to different pages.

---

# Profile Navigation

When the user opens **Profile**, display a left-side Profile navigation panel containing:

- Profile
- Personal Information
- Account & Security
- Danger Zone

The currently selected section should use the existing STRUCTRA orange active state.

Do not redesign the existing application sidebar.

---

# Profile Section

Purpose:

Provide a clean overview of the user's account.

Display:

- Profile header card
- User avatar
- Name
- Email
- Premium plan badge
- Member since
- Edit Profile button
- Email
- Account type
- Documents uploaded
- Member since
- Quick overview cards
- Account status
- Last login
- Storage usage
- Security / privacy information card

This should match the approved Profile header reference.

---

# Personal Information Section

Purpose:

Allow users to manage their personal details.

Display editable information including:

- Full name
- Email
- Phone number
- Organization
- Job title
- Location
- Profile picture
- Preferred language

Provide:

- Edit Mode
- Save Changes
- Cancel

Do not allow editing until Edit Mode is enabled.

---

# Account & Security Section

Purpose:

Manage authentication and account security.

Support two account types.

## Google Account Users

Display:

- Google Account as the active sign-in method.
- Connected Google email.
- Account recovery information.
- Active sessions.
- Security activity.

Hide password management for Google-only users.

## Email & Password Users

Display:

- Email & Password as the active sign-in method.
- Change Password.
- Account recovery.
- Recovery email.
- Recovery phone.
- Active sessions.
- Current device.
- Other logged-in devices.
- Security activity.

The UI should automatically adapt depending on the authentication provider.

---

# Danger Zone Section

Purpose:

Allow users to permanently delete their account.

Display:

- Permanent deletion warning.
- What will be deleted.
- Uploaded documents.
- Extracted information.
- AI conversations.
- Account information.
- Analytics and activity.
- DELETE confirmation input.
- Delete My Account button.
- Cancel button.

Account deletion must require the user to type:

DELETE

before enabling the Delete Account button.

---

# Visual Requirements

Preserve the existing STRUCTRA design language.

Use:

- Deep dark background
- Premium glassmorphism
- Warm orange accents
- Red warning accents only inside Danger Zone
- Soft borders
- Ambient glow
- Clean spacing
- Strong typography hierarchy
- Rounded glass cards
- Smooth transitions

Do NOT redesign:

- Main application sidebar
- Top navigation
- User/profile area
- Background
- Existing STRUCTRA application shell

The Profile workspace must feel like a native part of the existing STRUCTRA application.

---

# Update assets-map.md

The core functionality sections of the Main Page are now complete.

Remove the asset mappings related to:

- Upload Documents
- Dashboard
- Document Library
- AI Assistant

Replace them with the new Profile workspace asset mappings:

design-assets/Main Page/Profile/Profile-header-reference.png

design-assets/Main Page/Profile/personal-info-reference.png

design-assets/Main Page/Profile/Account-security-reference.png

design-assets/Main Page/Profile/danger-zone-reference.png