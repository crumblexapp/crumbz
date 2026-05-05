import Capacitor
import AuthenticationServices

@objc(SignInWithApplePlugin)
public class SignInWithApplePlugin: CAPPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    private var savedCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        self.savedCall = call

        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()

        let scopes = call.getString("scopes") ?? "email name"
        var authScopes: [ASAuthorization.Scope] = []
        if scopes.contains("email") { authScopes.append(.email) }
        if scopes.contains("name") { authScopes.append(.fullName) }
        request.requestedScopes = authScopes

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge!.viewController!.view.window!
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = savedCall,
              let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            savedCall?.reject("Apple Sign In failed")
            return
        }

        var response: [String: Any] = [
            "identityToken": identityToken,
            "user": credential.user,
            "givenName": credential.fullName?.givenName ?? "",
            "familyName": credential.fullName?.familyName ?? "",
            "email": credential.email ?? "",
        ]

        if let authCodeData = credential.authorizationCode,
           let authCode = String(data: authCodeData, encoding: .utf8) {
            response["authorizationCode"] = authCode
        }

        call.resolve(["response": response])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let nsError = error as NSError
        if nsError.code == ASAuthorizationError.canceled.rawValue {
            savedCall?.reject("cancel")
        } else {
            savedCall?.reject(error.localizedDescription)
        }
    }
}
