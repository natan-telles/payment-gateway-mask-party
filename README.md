# Payment Gateway Project

## Debrief Context

Design a landing page to make a pre-order for a party ticket, and after a time defined unlock the payment to the users.

The key factor here is confirming the payment and avoiding fraud. After payment confirmation, the system should automatically send:

- Payment receipt
- Dress code
- Party instructions

Additionally, queue position is immutable and determined by registration timestamp. The first users to register must be the first users notified when tickets become available. This is the primary prioritization filter.

A QR Code should also be available to redirect users to the pre-order landing page.

---

## Objectives

- Build anticipation through a waiting queue.
- Release tickets at a later date.
- Prioritize notifications according to queue order.
- Receive payment via PIX.
- Confirm payment automatically.
- Send instructions and ticket after approval.

---

## Data Needed

`* = Required Field`

| Field | Required |
|---------|---------|
| Name | ✅ |
| Phone | ✅ |
| Email | ✅ |
| Age | ❌ |
| Neighborhood | ❌ |
| Instagram | ❌ |

### Field Notes

- Email acts as a fallback communication channel and redundancy for phone contact.
- Neighborhood will be used to connect users to a community/GC.
- Age and neighborhood are important for post-event engagement and audience analysis.

### Duplicate Prevention

Prevent duplicate registrations based on:

- Phone
- Email

---

## Backend Data to Register

```text
id
created_at
queue_position
notification_status
notification_date
payment_status
payment_date
ticket_status
ticket_code
checkin_status
source
```

### Source Examples

```text
Instagram
WhatsApp
QR Poster
Flyer
Referral
Direct Link
```

---

## Visual Identity

**To Be Defined**

---

## Payment Information

### Preferred Payment Method

PIX via QR Code

### Payment Expiration

Each payment request expires after a defined number of hours.

If payment is not completed:

- Ticket returns to inventory
- User loses priority access or moves to the end of the current batch
- Next person in queue is notified

---

## Release Announcement

**1st Release Tickets**

Date: **17/10/2026**

Campaign:

> The Waiting Queue

---

## User Flow

```text
  Social Media / Papers
          ↓
       QR Code
          ↓
     Landing Page
          ↓
     Waiting Queue
```

---

## Key Features

### MVP

- ✅ Landing Page
- ✅ Waiting Queue
- ✅ QR Code
- ✅ Queue Position
- ✅ Admin Dashboard
- ✅ WhatsApp Notification
- ✅ PIX Payment
- ✅ Payment Confirmation
- ✅ Ticket Delivery

### Future Improvements

- Email Automation
- Analytics Dashboard
- Dynamic QR Codes
- Community Segmentation by Neighborhood
- Post-Event Surveys
- Referral Program

---

## Additional Content

### Social Proof

- Testimonials
- Aftermovies

### FAQ

#### How does the queue work?

Users are positioned based on registration timestamp. Earlier registrations receive access first.

#### How will I receive payment access?

Through WhatsApp and/or email notifications.

#### Is joining free?

Yes. Joining the waiting queue does not require payment.

#### Is my ticket guaranteed?

No. Queue registration only guarantees notification priority when tickets become available.

---

# Backlog

---

# Landing + Data Persistence

## Epic 1 - Landing Page

### User Stories

- Create responsive landing page
- Create event branding section
- Create FAQ section
- Create waiting list form
- Create success screen
- Create QR Code integration

---

## Epic 2 - Queue Management

### User Stories

- Save lead information
- Create unique identifier
- Store queue position
- Timestamp registrations
- Prevent duplicate phone numbers
- Prevent duplicate email addresses
- Admin queue dashboard

---

## Epic 3 - Communication

### User Stories

- WhatsApp notification integration
- SMS fallback
- Email integration
- Queue release notifications
- Reminder notifications

---

## Epic 4 - Analytics

### User Stories

- Registrations by day
- Registrations by neighborhood
- Age distribution
- Conversion funnel
- Campaign attribution

---

# Payment Gateway

## Epic 1 - Payment Provider Integration

### Possible Providers

- Mercado Pago
- Asaas
- PagBank
- Stripe (PIX support through partners)

---

## Epic 2 - PIX Generation

### User Stories

- Generate PIX QR Code
- Generate PIX Copy & Paste
- Set expiration
- Unique payment per customer

---

## Epic 3 - Payment Confirmation

### User Stories

- Receive webhook
- Validate payment status
- Prevent duplicate confirmations
- Prevent manual fraud attempts
- Reconcile payments
- Validate PIX transaction ID
- Validate amount received
- Validate payer reference
- Prevent duplicate ticket issuance
- Prevent webhook replay attacks

---

## Epic 4 - Ticket Issuance

### User Stories

- Generate ticket code
- Generate entry QR Code
- Generate receipt
- Generate attendee list
- Validate ticket QR Code at entrance
- Mark attendee as checked-in
- Prevent duplicate entry attempts

---

## Epic 5 - Post-Payment Automation

### User Stories

Upon payment approval:

- Send confirmation message
- Send dress code
- Send party guide
- Send location details
- Send ticket QR Code

---

# Open Business Decisions

The following items must be defined prior to development:

## Ticket Inventory

Example:

```text
1st Release - 100 tickets
2nd Release - 150 tickets
3rd Release - 200 tickets
```

## Payment Expiration Time

Example:

```text
12 hours
```

or

```text
24 hours
```

## Entrance Check-In Process

Define:

- Check-in operation flow
- Ticket validation method
- Entry rules
- Re-entry policy

---

# Repository Description

> Event ticket pre-order system with immutable waiting queue, PIX payment integration, fraud prevention, automated notifications, and digital ticket delivery.
