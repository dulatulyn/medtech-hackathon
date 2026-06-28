const S = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...props} />
)

export const Dash = () => <S><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></S>
export const Upload = () => <S><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><path d="M12 16V4"/><path d="M8 8l4-4 4 4"/></S>
export const Docs = () => <S><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></S>
export const Verify = () => <S><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z"/><path d="M9.2 12l2 2 3.6-3.8"/></S>
export const Match = () => <S><path d="M9 7H6a4 4 0 0 0 0 8h3"/><path d="M15 7h3a4 4 0 0 1 0 8h-3"/><path d="M8 11h8"/></S>
export const Alert = () => <S><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/></S>
export const Search = () => <S><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></S>
export const Clinic = () => <S><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-5h6v5"/><path d="M12 8.5v3M10.5 10h3"/></S>
export const Book = () => <S><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M19 17H8a3 3 0 0 0-3 3"/></S>
export const Check = () => <S strokeWidth="2"><path d="M5 12.5l4.5 4.5L19 6.5"/></S>
export const Menu = () => <S><path d="M4 7h16M4 12h16M4 17h16"/></S>
export const Logout = () => <S><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></S>

export const icons = { Dash, Upload, Docs, Verify, Match, Alert, Search, Clinic, Book }
