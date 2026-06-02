import i18n from "i18next";
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            password: "Password",
            sign_in: "Sign In",
            create_account: "Create Account",
            name: "Name",
            sign_up: "Sign Up",
            already_account: "Already have an account?",
            match_me: "Match Me",
            chat: "My Chats",
            what_thought: "What are you thinking about?",
            home_tab: "Home",
            profile: "Profile",
            type_thought: "Type your thought...",
            logout: 'Log Out',
            full_name: 'NAME',
            finding_match: 'Finding Match',
            matching: 'Matching',
            alert_match_not_found: "No matches yet. You're the first one thinking this! We'll notify you when a match is found.",
            new_thought: "New thought",
            matched: "Matched: Sending",
            thought_too_short: "Thought Too Short",
            write_more: "Write a bit more to find a better match.",
            info_first: "To support meaningful, focused connections, ThoughtMatch limits everyone to a maximum of 3 concurrent active conversations at one time.",
            info_second: "If you want to match on a new thought, you must open and abandon one of your current chat rooms first!",
            auth_error_msg: "Your email or password is wrong",
            no_email: '🧠 Welcome! No real email verification required. Click "Create Account" and Type a made-up email and password to jump straight into the alpha trial.',
            chat_limit: 'Active Chat Limit',
            limit_reached: "Chat Limit Reached",
            three_chats: "You currently have 3 active chats. You must abandon or close at least one of your current conversations before matching on a new thought.",
            view_matches: "View My Matches",
            cancel: "Cancel",
            chat_with_AI: 'Chat with AI',
            wait: 'Okay, Wait',

            
            matched_on: "You matched on:",
            with: "with",
            partner_left: "has left the chat",
            close_chat: "Close Chat",
            message_placeholder: "Message...",
            chat_options: "Chat Options",
            report_user: "Report User",
            abandon_chat: "Abandon Chat",
            report_title: "Select a Reason for Reporting",
            reason_harassment: "Harassment or Bullying",
            reason_spam: "Spam or Scam Attempts",
            reason_explicit: "Inappropriate/Explicit Content",
            reason_other: "Other Violation",
            confirm_abandon_title: "Are you absolutely sure?",
            confirm_abandon_subtitle: "This will delete the chat for both users and cannot be undone",
            confirm_abandon_yes: "Yes, Abandon Chat",
            confirm_abandon_no: "No, Keep Chatting",

            your_matches: "Your Matches",
            tap_to_chat: "Tap to chat",
            no_matches_yet: "No matches yet. Go think something!",
            go_think_btn: "Go Think!",
            back_btn: "Back",
            age: 'DOB'
        }
    },
    es: {
        translation: {
            password: "Contraseña",
            sign_in: "Iniciar Sesión",
            create_account: "Crear Cuenta",
            name: "Nombre",
            sign_up: "Crear Cuenta",
            already_account: "¿Ya tienes una cuenta?",
            match_me: "Encontrar Match",
            chat: "Mis Chats",
            what_thought: "¿En qué estás pensando?",
            home_tab: "Home",
            profile: "Perfil",
            type_thought: "Escribe tu pensamiento...",
            logout: 'Cerrar Sesion',
            full_name: 'NOMBRE',
            finding_match: 'Encontrando Match',
            matching: 'Conectando',
            alert_match_not_found: "Aún no hay coincidencias. ¡Eres el primero en pensarlo! Te avisaremos cuando encontremos una coincidencia.",
            new_thought: "Nuevo pensamiento",
            matched: "Conectado: Enviando",
            thought_too_short: "Pensamiento demasiado corto",
            write_more: "Escribe un poco más para encontrar una mejor coincidencia.",
            info_first: "Para fomentar conexiones significativas y centradas, ThoughtMatch limita a cada usuario a un máximo de 3 conversaciones activas simultáneas.",
            info_second: "Si quieres conectar con un nuevo pensamiento, ¡primero debes abrir y abandonar una de tus salas de chat actuales!",
            auth_error_msg: 'Tu correo electrónico o contraseña son incorrectos.',
            no_email: '🧠 ¡Bienvenido/a! No se requiere verificación de correo electrónico. Click en "Crear Cuenta" y Introduce un correo electrónico y una contraseña ficticios para acceder directamente a la prueba alfa.',
            chat_limit: 'Límite de chats activos',
            limit_reached: "Se ha alcanzado el límite de chat",
            three_chats: "Actualmente tienes 3 chats activos. Debes abandonar o cerrar al menos una de tus conversaciones actuales antes de poder conectar con un nuevo pensamiento.",
            view_matches: "Ver mis matches",
            chat_with_AI: 'Chatea con IA',
            wait: 'Okay, Esperar',

            matched_on: "Conectaste en:",
            with: "con",
            partner_left: "ha salido del chat",
            close_chat: "Cerrar Chat",
            message_placeholder: "Mensaje...",
            chat_options: "Opciones del Chat",
            report_user: "Reportar Usuario",
            abandon_chat: "Abandonar Chat",
            report_title: "Selecciona un Motivo de Reporte",
            reason_harassment: "Acoso o Bullying",
            reason_spam: "Spam o Intentos de Estafa",
            reason_explicit: "Contenido Inapropiado/Explícito",
            reason_other: "Otra Violación",
            confirm_abandon_title: "¿Estás absolutamente seguro?",
            confirm_abandon_subtitle: "Esto eliminará el chat para ambos usuarios y no se puede deshacer",
            confirm_abandon_yes: "Sí, Abandonar Chat",
            confirm_abandon_no: "No, Continuar Chateando",
            cancel: "Cancelar",

            your_matches: "Mis Chats",
            tap_to_chat: "Presiona para chatear",
            no_matches_yet: "No hay conexiones aún. ¡Ve a pensar algo!",
            go_think_btn: "¡A Pensar!",
            back_btn: "Volver",

            
        }
    }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', 
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    },
    react: {
        useSuspense: false
    }
  });

export default i18n;
