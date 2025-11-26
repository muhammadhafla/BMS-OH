# Manual Testing Checklist
## Password Reset System - Pre-Production Validation

**Project:** BMS Password Reset System  
**Date:** November 25, 2025  
**Environment:** Pre-Production/Staging  
**Testing Duration:** 2-3 Hours  
**Testers Required:** 2-3 (QA, Developer, Product Owner)

---

## Pre-Testing Setup

### Environment Prerequisites
- [ ] **Database Setup**
  - [ ] PostgreSQL database created and accessible
  - [ ] Database migrations applied (`npx prisma migrate deploy`)
  - [ ] Test data seeded (users, branches)
  - [ ] Database connection verified

- [ ] **Environment Variables**
  - [ ] Production database URL configured
  - [ ] JWT secret set to secure random string
  - [ ] SMTP credentials configured (Zoho/Production)
  - [ ] Frontend URL properly set
  - [ ] NODE_ENV=production

- [ ] **Services Status**
  - [ ] API server running on production port
  - [ ] Database connections healthy
  - [ ] Email service connectivity verified
  - [ ] SSL certificates installed and valid

---

## Test Scenario 1: Password Change Workflow

### Test Case 1.1: Valid Password Change
**Objective:** Verify user can change password with valid current password

**Steps:**
1. [ ] Login to BMS application with valid credentials
2. [ ] Navigate to Settings/Account page
3. [ ] Locate "Change Password" section
4. [ ] Enter current password: `CurrentPassword123!`
5. [ ] Enter new password: `NewPassword456!`
6. [ ] Confirm new password: `NewPassword456!`
7. [ ] Click "Change Password" button
8. [ ] Observe success message
9. [ ] Verify password strength indicator shows "Strong"
10. [ ] Logout and attempt login with new password
11. [ ] Verify login succeeds with new password

**Expected Results:**
- ✅ Password change succeeds
- ✅ Success notification displayed
- ✅ New password works for login
- ✅ Old password no longer works

**Pass/Fail Criteria:** All steps must complete successfully

---

### Test Case 1.2: Invalid Current Password
**Objective:** Verify system rejects invalid current password

**Steps:**
1. [ ] Login to BMS application
2. [ ] Navigate to Settings/Account page
3. [ ] Enter current password: `WrongPassword123!`
4. [ ] Enter new password: `NewPassword456!`
5. [ ] Confirm new password: `NewPassword456!`
6. [ ] Click "Change Password" button
7. [ ] Observe error message

**Expected Results:**
- ❌ Password change fails
- ❌ Error message: "Current password is incorrect"
- ❌ No password change occurs

**Pass/Fail Criteria:** System must reject invalid current password

---

### Test Case 1.3: Weak Password Rejection
**Objective:** Verify weak passwords are rejected

**Steps:**
1. [ ] Login to BMS application
2. [ ] Navigate to Settings/Account page
3. [ ] Enter current password: `CurrentPassword123!`
4. [ ] Enter new password: `weak`
5. [ ] Observe password strength indicator
6. [ ] Attempt to submit form
7. [ ] Verify validation errors

**Expected Results:**
- ❌ Weak password rejected
- ❌ Password strength shows "Weak" or "Too Short"
- ❌ Form submission blocked
- ❌ Validation errors displayed

**Pass/Fail Criteria:** Weak passwords must be rejected

---

### Test Case 1.4: Password Mismatch
**Objective:** Verify password confirmation mismatch is detected

**Steps:**
1. [ ] Login to BMS application
2. [ ] Navigate to Settings/Account page
3. [ ] Enter current password: `CurrentPassword123!`
4. [ ] Enter new password: `NewPassword456!`
5. [ ] Confirm new password: `DifferentPassword789!`
6. [ ] Observe mismatch indication
7. [ ] Attempt form submission

**Expected Results:**
- ❌ Password mismatch detected
- ❌ Error message displayed
- ❌ Form submission blocked

**Pass/Fail Criteria:** Mismatched passwords must be rejected

---

## Test Scenario 2: Forgot Password Workflow

### Test Case 2.1: Valid Email Forgot Password
**Objective:** Verify forgot password works with valid email

**Steps:**
1. [ ] Navigate to BMS login page
2. [ ] Click "Forgot Password?" link
3. [ ] Enter valid email: `test@bms.com`
4. [ ] Click "Send Reset Link" button
5. [ ] Observe success message
6. [ ] Check email inbox for reset email
7. [ ] Verify email contains reset link
8. [ ] Note token from URL for testing

**Expected Results:**
- ✅ Success message displayed
- ✅ Email received (check spam folder if needed)
- ✅ Email contains valid reset link
- ✅ Security information included

**Pass/Fail Criteria:** Valid email must trigger reset email

---

### Test Case 2.2: Invalid Email Format
**Objective:** Verify invalid email formats are rejected

**Steps:**
1. [ ] Navigate to BMS login page
2. [ ] Click "Forgot Password?" link
3. [ ] Enter invalid email: `invalid-email`
4. [ ] Click "Send Reset Link" button
5. [ ] Observe validation error

**Expected Results:**
- ❌ Invalid email rejected
- ❌ Error message: "Invalid email address"
- ❌ No email sent

**Pass/Fail Criteria:** Invalid emails must be rejected

---

### Test Case 2.3: Non-Existent Email
**Objective:** Verify system handles non-existent emails securely

**Steps:**
1. [ ] Navigate to BMS login page
2. [ ] Click "Forgot Password?" link
3. [ ] Enter non-existent email: `nonexistent@example.com`
4. [ ] Click "Send Reset Link" button
5. [ ] Observe response message

**Expected Results:**
- ✅ Generic success message displayed
- ✅ No indication if email exists
- ✅ Security maintained

**Pass/Fail Criteria:** System must not reveal email existence

---

### Test Case 2.4: Rate Limiting
**Objective:** Verify rate limiting prevents abuse

**Steps:**
1. [ ] Navigate to BMS login page
2. [ ] Click "Forgot Password?" link
3. [ ] Enter same email 4 times rapidly
4. [ ] Observe rate limiting behavior

**Expected Results:**
- ❌ 4th request rate limited
- ❌ Error message about too many attempts
- ❌ 15-minute wait time indicated

**Pass/Fail Criteria:** Rate limiting must activate after 3 attempts

---

## Test Scenario 3: Password Reset Workflow

### Test Case 3.1: Valid Token Password Reset
**Objective:** Verify password reset with valid token

**Steps:**
1. [ ] Use token from Test Case 2.1
2. [ ] Navigate to reset URL with token
3. [ ] Verify token validation succeeds
4. [ ] Enter new password: `ResetPassword123!`
5. [ ] Confirm password: `ResetPassword123!`
6. [ ] Click "Reset Password" button
7. [ ] Observe success message
8. [ ] Navigate to login page
9. [ ] Login with new password
10. [ ] Verify login succeeds

**Expected Results:**
- ✅ Token validation succeeds
- ✅ Password reset succeeds
- ✅ Success message displayed
- ✅ New password works for login

**Pass/Fail Criteria:** Valid token must enable password reset

---

### Test Case 3.2: Expired Token Rejection
**Objective:** Verify expired tokens are rejected

**Steps:**
1. [ ] Create token and wait 1+ hours OR
2. [ ] Manually expire token in database
3. [ ] Navigate to reset URL with expired token
4. [ ] Attempt password reset
5. [ ] Observe error message

**Expected Results:**
- ❌ Expired token rejected
- ❌ Error message about expiration
- ❌ Password reset blocked

**Pass/Fail Criteria:** Expired tokens must be rejected

---

### Test Case 3.3: Used Token Rejection
**Objective:** Verify used tokens cannot be reused

**Steps:**
1. [ ] Complete password reset with valid token
2. [ ] Attempt to use same token again
3. [ ] Navigate to reset URL with used token
4. [ ] Attempt password reset again
5. [ ] Observe error message

**Expected Results:**
- ❌ Used token rejected
- ❌ Error message about token already used
- ❌ Password reset blocked

**Pass/Fail Criteria:** Used tokens must be rejected

---

### Test Case 3.4: Invalid Token Format
**Objective:** Verify malformed tokens are rejected

**Steps:**
1. [ ] Navigate to reset URL with invalid token: `invalid-token`
2. [ ] Attempt password reset
3. [ ] Observe error handling

**Expected Results:**
- ❌ Invalid token rejected
- ❌ Appropriate error message
- ❌ No system exposure

**Pass/Fail Criteria:** Invalid tokens must be rejected

---

## Test Scenario 4: Security Validation

### Test Case 4.1: SQL Injection Protection
**Objective:** Verify SQL injection attempts are prevented

**Steps:**
1. [ ] Test email field: `admin@test.com'; DROP TABLE users; --`
2. [ ] Test token field: `' OR '1'='1' --`
3. [ ] Verify system behavior

**Expected Results:**
- ❌ SQL injection attempts fail
- ❌ No database exposure
- ❌ Proper error handling

**Pass/Fail Criteria:** SQL injection must be prevented

---

### Test Case 4.2: XSS Protection
**Objective:** Verify XSS attempts are sanitized

**Steps:**
1. [ ] Test email field: `<script>alert("xss")</script>@test.com`
2. [ ] Test name field: `<img src=x onerror=alert('xss')>`
3. [ ] Verify output handling

**Expected Results:**
- ❌ XSS attempts neutralized
- ❌ No script execution
- ❌ Input properly escaped

**Pass/Fail Criteria:** XSS must be prevented

---

### Test Case 4.3: Token Security
**Objective:** Verify token generation and storage security

**Steps:**
1. [ ] Generate multiple tokens
2. [ ] Verify token format (64-character hex)
3. [ ] Check database storage
4. [ ] Verify token uniqueness

**Expected Results:**
- ✅ Tokens cryptographically secure
- ✅ Tokens properly stored
- ✅ No token pattern exploitation
- ✅ Unique tokens generated

**Pass/Fail Criteria:** Tokens must be cryptographically secure

---

## Test Scenario 5: User Interface Testing

### Test Case 5.1: Mobile Responsiveness
**Objective:** Verify UI works on mobile devices

**Steps:**
1. [ ] Test password change form on mobile viewport
2. [ ] Test forgot password modal on mobile
3. [ ] Test password reset form on mobile
4. [ ] Verify touch interactions

**Expected Results:**
- ✅ Forms responsive on mobile
- ✅ Modal displays correctly
- ✅ Buttons properly sized
- ✅ Touch targets adequate

**Pass/Fail Criteria:** UI must be mobile-friendly

---

### Test Case 5.2: Accessibility
**Objective:** Verify accessibility compliance

**Steps:**
1. [ ] Test with screen reader
2. [ ] Verify keyboard navigation
3. [ ] Check ARIA labels
4. [ ] Test color contrast
5. [ ] Verify focus indicators

**Expected Results:**
- ✅ Screen reader compatible
- ✅ Full keyboard navigation
- ✅ Proper ARIA implementation
- ✅ Adequate color contrast
- ✅ Clear focus indicators

**Pass/Fail Criteria:** Must meet WCAG 2.1 AA standards

---

### Test Case 5.3: Browser Compatibility
**Objective:** Verify cross-browser functionality

**Steps:**
1. [ ] Test in Chrome (latest)
2. [ ] Test in Firefox (latest)
3. [ ] Test in Safari (latest)
4. [ ] Test in Edge (latest)
5. [ ] Test in mobile browsers

**Expected Results:**
- ✅ All functionality works in all browsers
- ✅ Consistent UI appearance
- ✅ No browser-specific errors

**Pass/Fail Criteria:** Must work in all major browsers

---

## Test Scenario 6: Performance Testing

### Test Case 6.1: Load Testing
**Objective:** Verify system handles multiple concurrent users

**Steps:**
1. [ ] Simulate 50 concurrent password changes
2. [ ] Simulate 100 concurrent forgot password requests
3. [ ] Monitor response times
4. [ ] Check system stability

**Expected Results:**
- ✅ Response times under 1 second
- ✅ No system crashes
- ✅ Proper rate limiting
- ✅ Database performance acceptable

**Pass/Fail Criteria:** System must handle concurrent load

---

### Test Case 6.2: Database Performance
**Objective:** Verify database operations perform well

**Steps:**
1. [ ] Monitor database query times
2. [ ] Check connection pool usage
3. [ ] Verify token cleanup efficiency
4. [ ] Monitor memory usage

**Expected Results:**
- ✅ Database queries under 100ms
- ✅ Connection pool not exhausted
- ✅ Token cleanup automated
- ✅ Memory usage stable

**Pass/Fail Criteria:** Database performance must be optimal

---

## Test Scenario 7: Email Integration

### Test Case 7.1: SMTP Configuration
**Objective:** Verify email service configuration

**Steps:**
1. [ ] Verify SMTP credentials in production
2. [ ] Test email delivery to various providers
3. [ ] Check email deliverability
4. [ ] Verify email templates render correctly

**Expected Results:**
- ✅ SMTP configuration valid
- ✅ Emails delivered to all providers
- ✅ Templates display correctly
- ✅ No spam folder issues

**Pass/Fail Criteria:** Email service must be reliable

---

### Test Case 7.2: Email Template Validation
**Objective:** Verify email templates are professional

**Steps:**
1. [ ] Check HTML email rendering
2. [ ] Verify plain text version
3. [ ] Test responsive email design
4. [ ] Check branding consistency
5. [ ] Verify security information

**Expected Results:**
- ✅ Professional HTML design
- ✅ Plain text fallback available
- ✅ Responsive email layout
- ✅ Consistent branding
- ✅ Security warnings included

**Pass/Fail Criteria:** Email templates must be professional

---

## Test Scenario 8: Error Handling

### Test Case 8.1: Network Connectivity
**Objective:** Verify system handles network issues

**Steps:**
1. [ ] Test with intermittent connectivity
2. [ ] Test with slow network
3. [ ] Test with offline scenarios
4. [ ] Verify retry mechanisms

**Expected Results:**
- ✅ Graceful degradation
- ✅ Appropriate timeout handling
- ✅ User-friendly error messages
- ✅ Retry mechanisms work

**Pass/Fail Criteria:** Network issues must be handled gracefully

---

### Test Case 8.2: Service Dependencies
**Objective:** Verify system handles service failures

**Steps:**
1. [ ] Simulate database connection failure
2. [ ] Simulate email service failure
3. [ ] Test recovery scenarios
4. [ ] Verify fallback mechanisms

**Expected Results:**
- ✅ Service failures handled gracefully
- ✅ Appropriate error messages
- ✅ System recovery mechanisms
- ✅ Fallback to development mode

**Pass/Fail Criteria:** Service failures must be handled

---

## Test Scenario 9: Compliance & Documentation

### Test Case 9.1: Security Compliance
**Objective:** Verify security best practices

**Steps:**
1. [ ] Review password policies
2. [ ] Check data encryption
3. [ ] Verify audit logging
4. [ ] Test access controls
5. [ ] Review token security

**Expected Results:**
- ✅ Strong password policies
- ✅ Data encrypted in transit/rest
- ✅ Audit trail maintained
- ✅ Proper access controls
- ✅ Secure token handling

**Pass/Fail Criteria:** Must meet security standards

---

### Test Case 9.2: Documentation Review
**Objective:** Verify all documentation is complete

**Steps:**
1. [ ] Review API documentation
2. [ ] Check user guides
3. [ ] Verify deployment instructions
4. [ ] Test troubleshooting guides
5. [ ] Review security documentation

**Expected Results:**
- ✅ API docs complete and accurate
- ✅ User guides clear and helpful
- ✅ Deployment instructions step-by-step
- ✅ Troubleshooting guides comprehensive
- ✅ Security docs up to date

**Pass/Fail Criteria:** Documentation must be complete

---

## Final Validation

### Production Readiness Checklist
- [ ] **Security**: All security measures implemented and tested
- [ ] **Performance**: System meets performance requirements
- [ ] **Reliability**: System handles failures gracefully
- [ ] **Usability**: UI is user-friendly and accessible
- [ ] **Compatibility**: Works across browsers and devices
- [ ] **Documentation**: All documentation complete
- [ ] **Monitoring**: Monitoring and alerting configured
- [ ] **Backup**: Backup and recovery procedures tested

### Sign-off Requirements
- [ ] **QA Team**: All test cases passed
- [ ] **Development Team**: Code review and security audit complete
- [ ] **Product Owner**: User acceptance testing passed
- [ ] **DevOps Team**: Deployment procedures validated
- [ ] **Security Team**: Security assessment approved

### Go-Live Criteria
- [ ] Zero critical bugs
- [ ] Performance benchmarks met
- [ ] Security requirements satisfied
- [ ] User acceptance criteria met
- [ ] All documentation approved
- [ ] Support team trained

---

## Test Results Summary

**Total Test Cases:** 45  
**Passed:** ___  
**Failed:** ___  
**Blocked:** ___  
**Success Rate:** ___%

### Critical Issues Found:
1. _________________________________
2. _________________________________
3. _________________________________

### Recommendations:
1. _________________________________
2. _________________________________
3. _________________________________

---

**Test Completion Date:** _______________  
**Tested By:** _______________  
**Reviewed By:** _______________  
**Approved By:** _______________

---

**Final Status:** 
- [ ] ✅ **PASS** - Ready for Production
- [ ] ❌ **FAIL** - Requires Fixes Before Production
- [ ] ⚠️ **CONDITIONAL** - Minor Issues, Production Ready with Monitoring

---

*This checklist ensures comprehensive testing of the password reset system before production deployment. All test cases must be completed and passed before the system can be considered production-ready.*