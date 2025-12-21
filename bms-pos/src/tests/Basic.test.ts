/**
 * Basic Test - Testing Foundation Demonstration
 * This test demonstrates that the testing infrastructure is working
 */

describe('Testing Foundation', () => {
  it('should demonstrate basic testing functionality', () => {
    // Basic arithmetic test
    expect(2 + 2).toBe(4)
    
    // String operations
    expect('BMS POS'.toLowerCase()).toBe('bms pos')
    
    // Array operations
    const numbers = [1, 2, 3, 4, 5]
    expect(numbers).toHaveLength(5)
    expect(numbers).toContain(3)
  })

  it('should demonstrate Jest matchers', () => {
    // Object matching
    const user = {
      id: '1',
      username: 'testuser',
      role: 'admin',
    }
    
    expect(user).toEqual({
      id: '1',
      username: 'testuser',
      role: 'admin',
    })
    
    // Partial matching
    expect(user).toMatchObject({
      username: 'testuser',
      role: 'admin',
    })
    
    // Truthy checks
    expect(user.id).toBeTruthy()
    expect(user.username).toBeDefined()
  })

  it('should demonstrate async testing', async () => {
    // Simulate async operation
    const asyncOperation = () => Promise.resolve('success')
    
    const result = await asyncOperation()
    expect(result).toBe('success')
  })

  it('should demonstrate error testing', () => {
    // Test error throwing
    const throwError = () => {
      throw new Error('Test error')
    }
    
    expect(throwError).toThrow('Test error')
    expect(throwError).toThrow()
  })

  it('should demonstrate mock functions', () => {
    // Create a mock function
    const mockFunction = jest.fn()
    
    // Call the mock function
    mockFunction('arg1', 'arg2')
    
    // Verify the mock was called
    expect(mockFunction).toHaveBeenCalledTimes(1)
    expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2')
    
    // Test mock return value
    mockFunction.mockReturnValue('mocked result')
    expect(mockFunction()).toBe('mocked result')
  })

  it('should demonstrate timer mocking', () => {
    // Mock timers
    jest.useFakeTimers()
    
    let counter = 0
    const interval = setInterval(() => {
      counter++
    }, 1000)
    
    // Fast-forward time
    jest.advanceTimersByTime(3500)
    
    // Verify timer ran expected number of times
    expect(counter).toBe(3)
    
    // Clean up
    clearInterval(interval)
    jest.useRealTimers()
  })

  it('should demonstrate snapshot testing concept', () => {
    const data = {
      timestamp: new Date().toISOString(),
      user: {
        id: '123',
        name: 'Test User',
        permissions: ['read', 'write'],
      },
      settings: {
        theme: 'dark',
        language: 'en',
      },
    }
    
    // Basic snapshot-like validation
    expect(data).toMatchObject({
      timestamp: expect.any(String),
      user: {
        id: expect.any(String),
        name: expect.any(String),
        permissions: expect.arrayContaining(['read']),
      },
      settings: expect.objectContaining({
        theme: expect.any(String),
      }),
    })
  })
})

describe('Security Testing Examples', () => {
  it('should demonstrate input validation testing', () => {
    // Test input sanitization concept
    const sanitizeInput = (input: string) => {
      return input.trim().replace(/[<>]/g, '')
    }
    
    expect(sanitizeInput('  <script>alert("xss")</script>  ')).toBe('scriptalert("xss")/script')
    expect(sanitizeInput('normal input')).toBe('normal input')
  })

  it('should demonstrate password hashing concept', async () => {
    // Mock bcrypt for demonstration
    const mockBcrypt = {
      hash: jest.fn().mockResolvedValue('hashed_password_123'),
      compare: jest.fn().mockResolvedValue(true),
    }
    
    const password = 'user_password_123'
    const hashedPassword = await mockBcrypt.hash(password)
    
    expect(hashedPassword).toBe('hashed_password_123')
    expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10)
    
    const isValid = await mockBcrypt.compare(password, hashedPassword)
    expect(isValid).toBe(true)
  })

  it('should demonstrate session security testing', () => {
    // Mock session validation
    const validateSession = (sessionToken: string, expiryTime: number) => {
      const now = Date.now()
      const isValid = sessionToken.length > 10 && expiryTime > now
      return { valid: isValid, expired: !isValid && expiryTime <= now }
    }
    
    const validSession = validateSession('valid_session_token_12345', Date.now() + 3600000)
    expect(validSession.valid).toBe(true)
    expect(validSession.expired).toBe(false)
    
    const expiredSession = validateSession('expired_token', Date.now() - 1000)
    expect(expiredSession.valid).toBe(false)
    expect(expiredSession.expired).toBe(true)
  })

  it('should demonstrate rate limiting testing', () => {
    // Mock rate limiter
    class RateLimiter {
      private attempts: number[] = []
      private readonly maxAttempts = 5
      private readonly timeWindow = 15 * 60 * 1000 // 15 minutes
      
      canAttempt(): boolean {
        const now = Date.now()
        this.attempts = this.attempts.filter(time => now - time < this.timeWindow)
        return this.attempts.length < this.maxAttempts
      }
      
      recordAttempt(): void {
        this.attempts.push(Date.now())
      }
      
      getRemainingAttempts(): number {
        const now = Date.now()
        this.attempts = this.attempts.filter(time => now - time < this.timeWindow)
        return Math.max(0, this.maxAttempts - this.attempts.length)
      }
    }
    
    const limiter = new RateLimiter()
    
    // Should allow attempts initially
    expect(limiter.canAttempt()).toBe(true)
    expect(limiter.getRemainingAttempts()).toBe(5)
    
    // Record failed attempts
    for (let i = 0; i < 5; i++) {
      limiter.recordAttempt()
    }
    
    // Should be blocked now
    expect(limiter.canAttempt()).toBe(false)
    expect(limiter.getRemainingAttempts()).toBe(0)
  })
})