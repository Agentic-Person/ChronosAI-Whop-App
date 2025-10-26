# Test Chat Limits

After running the SQL, test the FREE tier limits:

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Go to: http://localhost:3000/dashboard/student/chat

3. Sign up as a NEW user (or use incognito mode)

4. Ask your first question - should work normally

5. Ask second question - should show "1 question remaining"

6. Ask third question - should show "Last free question!"

7. Try fourth question - should show upgrade modal

If this works, your FREE tier limits are properly configured! 🎉
