import React, { useState } from "react";
import { Link2, Mail, MoreHorizontal, Pencil, Trash2 } from "@/components/icons";
import { Menu, MenuDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { hostOf, isMailto, isSafeHref, linkLabel } from "./linkModel";
import styles from "./LinkRow.module.css";

function Favicon({ url }) {
  const host = hostOf(url);
  const [failed, setFailed] = useState(false);
  if (isMailto(url)) return <Mail size={16} strokeWidth={1.75} aria-hidden="true" />;
  if (!host || failed) return <Link2 size={16} strokeWidth={1.75} aria-hidden="true" />;
  return (
    <img
      src={`https://www.google.com/s2/favicons?sz=64&domain=${host}`}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      onError={() => setFailed(true)}
      className={styles.favicon}
    />
  );
}

export default function LinkRow({ link, onEdit, onRemove }) {
  const label = linkLabel(link);
  const body = (
    <>
      <span className={styles.icon}><Favicon url={link.url} /></span>
      <span className={styles.text}>
        <span className={styles.title}>{label}</span>
        <span className={styles.url}>{link.url}</span>
      </span>
    </>
  );

  return (
    <li className={styles.row}>
      {isSafeHref(link.url) ? (
        <a
          href={link.url}
          className={styles.main}
          title={link.url}
          {...(isMailto(link.url) ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        >
          {body}
          {!isMailto(link.url) && <span className={styles.srOnly}>(opens in a new tab)</span>}
        </a>
      ) : (
        <span className={styles.main} title="This link type is not supported, so it can't be opened.">{body}</span>
      )}
      <Menu.Root>
        <Menu.Trigger render={<IconButton icon={MoreHorizontal} label={`Actions for ${label}`} tooltip={false} />} />
        <Menu.Content align="end">
          <Menu.Item onClick={onEdit}><Pencil size={16} strokeWidth={1.75} aria-hidden="true" />Edit link</Menu.Item>
          <Menu.Separator />
          <MenuDangerItem onClick={onRemove}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />Remove link</MenuDangerItem>
        </Menu.Content>
      </Menu.Root>
    </li>
  );
}
