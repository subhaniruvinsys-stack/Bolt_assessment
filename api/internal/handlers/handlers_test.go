package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"bolt-otp-api/internal/db"
	"bolt-otp-api/internal/models"
)

func setupTestHandler() *Handler {
	store := db.NewMemoryStore()
	return NewHandler(store)
}

func TestRegister(t *testing.T) {
	h := setupTestHandler()

	payload := models.RegisterRequest{
		Email:     "test@example.com",
		FirstName: "Jane",
		LastName:  "Doe",
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/register", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	h.Register(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d", w.Code)
	}

	var resp models.RegisterResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(resp.Code) != 6 {
		t.Errorf("Expected 6-digit code, got %s", resp.Code)
	}

	// Test Duplicate Register
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("POST", "/api/register", bytes.NewBuffer(body))
	h.Register(w2, req2)

	if w2.Code != http.StatusConflict {
		t.Errorf("Expected status 409 Conflict for duplicate email, got %d", w2.Code)
	}
}

func TestRecognize(t *testing.T) {
	h := setupTestHandler()

	// Register user
	regPayload := models.RegisterRequest{
		Email:     "shopper@example.com",
		FirstName: "Alex",
		LastName:  "Smith",
	}
	regBody, _ := json.Marshal(regPayload)
	regReq := httptest.NewRequest("POST", "/api/register", bytes.NewBuffer(regBody))
	h.Register(httptest.NewRecorder(), regReq)

	// Test recognize existing email
	recPayload := models.RecognizeRequest{Email: "shopper@example.com"}
	recBody, _ := json.Marshal(recPayload)
	req := httptest.NewRequest("POST", "/api/recognize", bytes.NewBuffer(recBody))
	w := httptest.NewRecorder()

	h.Recognize(w, req)

	var resp models.RecognizeResponse
	json.NewDecoder(w.Body).Decode(&resp)

	if !resp.Recognized {
		t.Errorf("Expected email to be recognized")
	}

	// Test recognize unknown email
	unknownPayload := models.RecognizeRequest{Email: "unknown@example.com"}
	unknownBody, _ := json.Marshal(unknownPayload)
	reqUnknown := httptest.NewRequest("POST", "/api/recognize", bytes.NewBuffer(unknownBody))
	wUnknown := httptest.NewRecorder()

	h.Recognize(wUnknown, reqUnknown)

	var respUnknown models.RecognizeResponse
	json.NewDecoder(wUnknown.Body).Decode(&respUnknown)

	if respUnknown.Recognized {
		t.Errorf("Expected unknown email to NOT be recognized")
	}
}

func TestLoginAndIdempotentCheckout(t *testing.T) {
	h := setupTestHandler()

	// 1. Register User
	regPayload := models.RegisterRequest{Email: "user@bolt.com", FirstName: "Bolt", LastName: "User"}
	regBody, _ := json.Marshal(regPayload)
	wReg := httptest.NewRecorder()
	h.Register(wReg, httptest.NewRequest("POST", "/api/register", bytes.NewBuffer(regBody)))

	var regResp models.RegisterResponse
	json.NewDecoder(wReg.Body).Decode(&regResp)

	// 2. Login with Wrong Code
	wrongLogin := models.LoginRequest{Email: "user@bolt.com", Code: "000000"}
	wrongBody, _ := json.Marshal(wrongLogin)
	wWrong := httptest.NewRecorder()
	h.Login(wWrong, httptest.NewRequest("POST", "/api/login", bytes.NewBuffer(wrongBody)))

	if wWrong.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 for wrong code, got %d", wWrong.Code)
	}

	// 3. Login with Correct Code
	correctLogin := models.LoginRequest{Email: "user@bolt.com", Code: regResp.Code}
	correctBody, _ := json.Marshal(correctLogin)
	wCorrect := httptest.NewRecorder()
	h.Login(wCorrect, httptest.NewRequest("POST", "/api/login", bytes.NewBuffer(correctBody)))

	if wCorrect.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for correct code, got %d", wCorrect.Code)
	}

	// 4. Idempotent Checkout Test
	checkoutPayload := models.CheckoutRequest{
		Email: "user@bolt.com",
		Phone: "+15550001111",
		ShippingAddress: models.ShippingAddress{
			FullName: "Bolt User",
			Street:   "100 Bolt Way",
			City:     "San Francisco",
			State:    "CA",
			ZipCode:  "94105",
			Country:  "USA",
		},
	}
	chkBody, _ := json.Marshal(checkoutPayload)

	idempotencyKey := "test-key-12345"

	// First submission
	req1 := httptest.NewRequest("POST", "/api/checkout", bytes.NewBuffer(chkBody))
	req1.Header.Set("Idempotency-Key", idempotencyKey)
	w1 := httptest.NewRecorder()
	h.Checkout(w1, req1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created on first checkout, got %d", w1.Code)
	}

	var chkResp1 models.CheckoutResponse
	json.NewDecoder(w1.Body).Decode(&chkResp1)

	// Duplicate submission with same key
	req2 := httptest.NewRequest("POST", "/api/checkout", bytes.NewBuffer(chkBody))
	req2.Header.Set("Idempotency-Key", idempotencyKey)
	w2 := httptest.NewRecorder()
	h.Checkout(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK on duplicate checkout, got %d", w2.Code)
	}

	var chkResp2 models.CheckoutResponse
	json.NewDecoder(w2.Body).Decode(&chkResp2)

	if chkResp1.OrderID != chkResp2.OrderID {
		t.Errorf("Expected same OrderID for duplicate submission, got %s vs %s", chkResp1.OrderID, chkResp2.OrderID)
	}

	if !chkResp2.Duplicate {
		t.Errorf("Expected Duplicate flag to be true on second submission")
	}
}
